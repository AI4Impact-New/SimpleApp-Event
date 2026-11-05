import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const client = '40faprqjpcc6q0pfkdkcrd8p5v';
const cid = '00000000-0000-0000-0000-000000000001';
const eid = '00000000-0000-0000-0000-000000000002';
const aid = '00000000-0000-0000-0000-000000000003';

async function seed(page: Page) {
  const now = Math.floor(Date.now() / 1000);
  const token = (claims: object) => `test.${Buffer.from(JSON.stringify({ sub: 'browser-qa', username: 'browser-qa', 'cognito:username': 'browser-qa', email: 'qa@example.invalid', iat: now, exp: now + 3600, ...claims })).toString('base64url')}.test`;
  await page.addInitScript(({ client, id, access }) => {
    const prefix = `CognitoIdentityServiceProvider.${client}`;
    localStorage.setItem('auth_id_token', id);
    localStorage.setItem('auth_token', access);
    localStorage.setItem(`${prefix}.LastAuthUser`, 'browser-qa');
    for (const [key, value] of Object.entries({ idToken: id, accessToken: access, refreshToken: 'synthetic-qa-refresh', clockDrift: '0' })) localStorage.setItem(`${prefix}.browser-qa.${key}`, value);
    localStorage.setItem('user_data', JSON.stringify({ id: 'browser-qa', email: 'qa@example.invalid', name: 'Original learner', user_type: 'professional', designation: 'Engineer', company: 'QA' }));
  }, { client, id: token({ token_use: 'id', aud: client }), access: token({ token_use: 'access', client_id: client }) });
}

/** Static hosting with SPA fallback: every page navigation gets the exported index.html (local export only). */
async function spaFallback(page: Page) {
  if (process.env.QA_STUDENT_URL) return;
  const index = path.join(__dirname, '../../dist/index.html');
  await page.route(url => url.host === '127.0.0.1:8765', route =>
    route.request().resourceType() === 'document' ? route.fulfill({ path: index, contentType: 'text/html' }) : route.continue());
}

test('profile updates immediately on return from editing', async ({ page }) => {
  await seed(page);
  let name = 'Original learner', saves = 0;
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path === '/users/me') {
      if (route.request().method() === 'PUT') { name = route.request().postDataJSON().name; saves++; }
      json = { id: cid, email: 'qa@example.invalid', name, user_type: 'professional', designation: 'Engineer', company: 'QA' };
    }
    return route.fulfill({ json });
  });
  // Synthetic credentials never reach Cognito or a real API.
  await page.route('https://cognito-idp.*.amazonaws.com/**', route => route.abort());
  // Desktop width: the navbar shows the first name next to the initials.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const navbar = page.getByRole('navigation');
  await expect(navbar.getByText('Original', { exact: true })).toBeVisible();
  await expect(navbar.getByText('OL', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Profile/ }).click();
  await page.getByRole('tab', { name: /Account/ }).click();
  await page.getByText('Edit profile', { exact: true }).click();
  await page.getByPlaceholder('Your name').fill('Updated learner');
  await page.getByText('Save Profile', { exact: true }).click();
  await expect(page.getByText('Updated learner', { exact: true }).first()).toBeVisible();
  expect(saves).toBe(1);
  // The navbar identity follows the edit without a reload.
  await expect(navbar.getByText('Updated', { exact: true })).toBeVisible();
  await expect(navbar.getByText('UL', { exact: true })).toBeVisible();
  await expect(navbar.getByText('Original', { exact: true })).toHaveCount(0);
});

test('web exam confirmation sends answers and displays the server score', async ({ page }) => {
  await seed(page);
  let submissions = 0;
  const course = { id: cid, title: 'QA enrolled course', status: 'published' };
  const exam = { id: eid, course_id: cid, title: 'QA assessment', published: true, question_count: 1, attempts_used: 0, max_attempts: 2, time_limit_seconds: 300, pass_percentage: 70 };
  const attempt = { id: aid, exam_id: eid, status: 'pending', score: null, max_score: 1, pass_percentage: 70, expires_at: new Date(Date.now() + 300000).toISOString(), questions: [{ id: 'q1', question: 'Choose the correct answer', points: 1, options: [{ id: 'a', label: 'Correct answer' }, { id: 'b', label: 'Other answer' }] }] };
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path === '/users/me') json = { id: cid, email: 'qa@example.invalid', name: 'QA learner', user_type: 'professional', designation: 'Engineer', company: 'QA' };
    if (path === '/me/learning') json = [course];
    if (path === `/learning/courses/${cid}`) json = { course, classes: [], completion: { eligible: false, missing_requirements: ['exam'], rules: { require_exam: true }, recorded_total: 0, recorded_completed: 0, exams_total: 1, exams_passed: 0, progress_percentage: 0 } };
    if (path === `/learning/courses/${cid}/exams`) json = [exam];
    if (path === `/learning/exams/${eid}/attempts`) json = attempt;
    if (path === `/learning/attempts/${aid}/submit`) {
      expect(route.request().postDataJSON()).toEqual({ answers: { q1: 'a' } });
      submissions++;
      json = { ...attempt, status: 'passed', score: 1, percentage: 100 };
    }
    return route.fulfill({ json });
  });
  await page.route('https://cognito-idp.*.amazonaws.com/**', route => route.abort());
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await page.getByRole('tab', { name: /My learning/i }).click();
  await page.getByText(course.title, { exact: true }).last().click();
  await page.getByRole('tab', { name: /Assessments/ }).click();
  await page.getByText(exam.title, { exact: true }).click();
  await page.getByText('Start or resume', { exact: true }).click();
  await page.getByText('Correct answer', { exact: true }).click();
  // Sidebar and last-question footer both offer "Submit attempt"; either opens the inline confirmation.
  await page.getByText('Submit attempt', { exact: true }).first().click();
  await expect(page.getByText('Submit this attempt?', { exact: true })).toBeVisible();
  expect(submissions).toBe(0);
  await page.getByText('Submit answers', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'You passed with 100%.' })).toBeVisible();
  await expect(page.getByText('1 / 1', { exact: true })).toBeVisible();
  expect(submissions).toBe(1);
});

for (const signedIn of [false, true]) {
  test(`public certificate link verifies on cold load and refresh when signed ${signedIn ? 'in' : 'out'}`, async ({ page }) => {
    const certificateId = '00000000-0000-0000-0000-000000000004';
    let verifications = 0;
    await spaFallback(page);
    if (signedIn) await seed(page);
    await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (path === '/users/me') json = { id: cid, email: 'qa@example.invalid', name: 'QA learner', user_type: 'professional', designation: 'Engineer', company: 'QA' };
      if (path === `/certificates/${certificateId}/verify`) {
        verifications++;
        json = { id: certificateId, valid: true, recipient_name: 'Verified Recipient', course_title: 'QA verified course' };
      }
      return route.fulfill({ json });
    });
    await page.route('https://cognito-idp.*.amazonaws.com/**', route => route.abort());

    await page.goto(`/verify?id=${certificateId}`);
    await expect(page.getByText('Valid certificate', { exact: true })).toBeVisible();
    await expect(page.getByText('Verified Recipient', { exact: true })).toBeVisible();
    expect(verifications).toBe(1);

    await page.reload();
    await expect(page.getByText('Valid certificate', { exact: true })).toBeVisible();
    await expect(page.getByText('Verified Recipient', { exact: true })).toBeVisible();
    expect(verifications).toBe(2);
  });
}

for (const fallback of [false, true]) test(`protected playback keeps the moving identity and renews access (${fallback ? 'viewport fallback' : 'fullscreen'})`, async ({ page }) => {
  await page.clock.install();
  if (fallback) await page.addInitScript(() => { Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { value: undefined }); });
  await seed(page);
  await spaFallback(page);
  let sessions = 0;
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    let json: unknown = [];
    const lesson = { id: eid, course_id: cid, title: 'Protected recording', class_type: 'recorded', duration_seconds: 3, sort_order: 0, access_state: 'available', video_status: 'ready' };
    if (pathname === '/users/me') json = { id: 'browser-qa', name: 'Original learner', email: 'qa@example.invalid', user_type: 'professional', designation: 'Engineer', company: 'QA', privacy_consent_required: false };
    if (pathname === `/learning/courses/${cid}` || pathname === `/learning/courses/${cid}/progress`) json = { course: { id: cid, title: 'Video QA' }, classes: [lesson], completion: { progress_percentage: 0 } };
    if (pathname === `/learning/classes/${eid}/playback`) {
      sessions++;
      json = { url: 'https://video.example.invalid/test.mp4', session_id: `session-${sessions}`, expires_in: sessions === 1 ? 8 : 900, duration_seconds: 3, resume_seconds: 0,
        watermark: { company: 'AI4Impact', student_id: 'verified-student-123', move_interval_seconds: 25 } };
    }
    if (pathname.endsWith('/progress') && route.request().method() === 'POST') json = { watched_seconds: 0, completed: false, progress_percentage: 0, duration_seconds: 3 };
    await route.fulfill({ json });
  });
  await page.route('https://video.example.invalid/test.mp4', route => route.fulfill({ path: path.join(__dirname, '../fixtures/playback.mp4'), contentType: 'video/mp4' }));
  await page.goto(`/learning/courses/${cid}/lectures/${eid}`);
  const mark = page.getByTestId('video-watermark');
  await expect(mark).toContainText('AI4Impact');
  await expect(mark).toContainText('Student ID: verified-student-123');
  await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2);
  await expect(page.locator('video')).toHaveJSProperty('disablePictureInPicture', true);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit full screen', exact: true })).toBeVisible();
  await expect(mark).toBeVisible();
  if (!fallback) await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute('data-testid'))).toBe('protected-video-stage');
  else await expect(page.getByTestId('protected-video-stage')).toHaveCSS('position', 'fixed');
  const before = await mark.boundingBox();
  await page.clock.fastForward(26_000);
  await expect.poll(() => sessions).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => JSON.stringify(await mark.boundingBox())).not.toBe(JSON.stringify(before));
  const box = (await mark.boundingBox())!;
  const stage = (await page.getByTestId('protected-video-stage').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(stage.x);
  expect(box.y).toBeGreaterThanOrEqual(stage.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await expect(mark).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).last().click();
  await expect.poll(() => page.locator('video').evaluate((el: HTMLVideoElement) => el.paused)).toBe(false);
});


test('missing server watermark prevents unmarked playback', async ({ page }) => {
  await seed(page);
  await spaFallback(page);
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (pathname === '/users/me') json = { id: cid, email: 'qa@example.invalid', name: 'QA learner', user_type: 'professional', designation: 'Engineer', company: 'QA' };
    if (pathname === `/learning/courses/${cid}`) json = { course: { id: cid, title: 'QA course' }, classes: [], completion: { progress_percentage: 0 } };
    if (pathname.endsWith('/playback')) json = { url: 'https://video.example.invalid/unmarked.mp4', session_id: aid, expires_in: 900, duration_seconds: 3 };
    await route.fulfill({ json });
  });
  await page.goto(`/learning/courses/${cid}/lectures/${eid}`);
  await expect(page.getByText('Could not load this lecture.', { exact: true })).toBeVisible();
  await expect(page.locator('video')).not.toHaveAttribute('src', /unmarked/);
  await expect(page.getByTestId('video-watermark')).toHaveCount(0);
});


for (const verified of [true, false]) test(`password recovery gives accurate guidance (${verified ? 'accepted request' : 'unverified email'})`, async ({ page }) => {
  await spaFallback(page);
  await page.route('https://cognito-idp.ap-south-1.amazonaws.com/**', async route => {
    if (!route.request().headers()['x-amz-target']?.endsWith('.ForgotPassword')) return route.continue();
    await route.fulfill(verified ? {
      status: 200, json: { CodeDeliveryDetails: { Destination: 'q***@e***.invalid', DeliveryMedium: 'EMAIL', AttributeName: 'email' } },
    } : {
      status: 400, headers: { 'x-amzn-errortype': 'InvalidParameterException' }, json: { __type: 'InvalidParameterException', message: 'Cannot reset password for the user as there is no registered/verified email or phone_number' },
    });
  });
  await page.goto('/forgot-password');
  await page.getByPlaceholder('your@email.com').fill('qa@example.invalid');
  await page.getByText('Send code', { exact: true }).click();
  if (verified) {
    await expect(page.getByText(/If this account is eligible for password recovery/)).toBeVisible();
    await expect(page.getByText(/Newly invited users must first sign in with their temporary password/)).toBeVisible();
    await expect(page.getByPlaceholder('123456')).toBeVisible();
  } else {
    await expect(page.getByText(/If you can sign in, open Profile and verify your email/)).toBeVisible();
    await expect(page.getByPlaceholder('123456')).toHaveCount(0);
  }
});

async function protectedScrubPlayer(page: Page, posts: Array<{event:string;position_seconds:number}>) {
  await seed(page);
  await spaFallback(page);
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    let json: unknown = [];
    const lesson = { id: eid, course_id: cid, title: 'Scrubbing QA', class_type: 'recorded', duration_seconds: 120,
      sort_order: 0, access_state: 'available', video_status: 'ready', watched_seconds: 4.8 };
    if (pathname === '/users/me') json = { id: cid, email: 'qa@example.invalid', name: 'QA learner', user_type: 'professional', designation: 'Engineer', company: 'QA' };
    if (pathname === `/learning/courses/${cid}` || pathname === `/learning/courses/${cid}/progress`) json = {
      course: { id: cid, title: 'QA course' }, classes: [lesson], completion: { progress_percentage: 0 } };
    if (pathname.endsWith('/playback')) json = { url: 'https://video.example.invalid/scrubbing.mp4', session_id: aid,
      expires_in: 900, duration_seconds: 120, resume_seconds: 2, watched_seconds: 4.8, completed: false,
      watermark: { company: 'AI4Impact', student_id: cid, move_interval_seconds: 25 } };
    if (pathname.endsWith('/progress') && route.request().method() === 'POST') {
      posts.push(route.request().postDataJSON());
      json = { class_id: eid, watched_seconds: 4.8, duration_seconds: 120, progress_percentage: 4, completed: false };
    }
    await route.fulfill({ json });
  });
  const clip = fs.readFileSync(path.join(__dirname, '../fixtures/scrubbing.mp4'));
  await page.route('https://video.example.invalid/scrubbing.mp4', route => {
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers()['range'] || '');
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), clip.length - 1) : clip.length - 1;
    return route.fulfill({ status: range ? 206 : 200, body: clip.subarray(start, end + 1), contentType: 'video/mp4',
      headers: { 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${clip.length}` } : {}) } });
  });
  await page.goto(`/learning/courses/${cid}/lectures/${eid}`);
  await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2);
  await expect(page.getByText(/4% watched \(/)).toBeVisible();
}

test('mouse drag, keyboard seek, skip buttons and 2x preserve unique watched progress', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const posts: Array<{event:string;position_seconds:number}> = [];
  await protectedScrubPlayer(page, posts);
  const slider = page.getByRole('slider', { name: 'Seek', exact: true });
  const bounds = (await slider.boundingBox())!;
  const seeks = () => posts.filter(p => p.event === 'seek').length;
  const before = seeks();
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height / 2, { steps: 12 });
  expect(seeks()).toBe(before);
  await page.mouse.up();
  await expect.poll(seeks).toBe(before + 1);
  const seekIndex = posts.findIndex(p => p.event === 'seek');
  expect(posts[seekIndex - 1].event).toBe('watch');
  expect(posts[seekIndex - 1].position_seconds).toBeLessThan(5);
  expect(posts[seekIndex].position_seconds).toBeGreaterThan(78);
  expect(posts[seekIndex].position_seconds).toBeLessThan(90);
  await expect(page.getByText(/4% watched \(/)).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('menuitem', { name: /Playback speed/ }).click();
  await page.getByRole('menuitemradio', { name: '2×', exact: true }).click();
  await expect(page.locator('video')).toHaveJSProperty('playbackRate', 2);
  await slider.focus();
  await page.keyboard.press('Home');
  await expect.poll(() => page.locator('video').evaluate((v:HTMLVideoElement) => v.currentTime)).toBeLessThan(1);
  await page.keyboard.press('End');
  await expect.poll(() => page.locator('video').evaluate((v:HTMLVideoElement) => v.currentTime)).toBeGreaterThan(118);
  await page.getByRole('button', { name: 'Back 10 seconds', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate((v:HTMLVideoElement) => v.currentTime)).toBeLessThan(111);
  await page.getByRole('button', { name: 'Forward 10 seconds', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate((v:HTMLVideoElement) => v.currentTime)).toBeGreaterThan(118);
  await expect(page.getByText(/4% watched \(/)).toBeVisible();
});

test.describe('touch scrubbing', () => {
  test.use({ hasTouch: true });
  test('commits one seek at touch release and leaves watch credit unchanged', async ({ page }) => {
    const posts: Array<{event:string;position_seconds:number}> = [];
    await protectedScrubPlayer(page, posts);
    const bounds = (await page.getByRole('slider', { name: 'Seek', exact: true }).boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const point = (ratio:number) => ({ x: bounds.x + bounds.width * ratio, y: bounds.y + bounds.height / 2 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(0.2)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(0.8)] });
    expect(posts.filter(p => p.event === 'seek')).toHaveLength(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => posts.filter(p => p.event === 'seek').length).toBe(1);
    await expect.poll(() => page.locator('video').evaluate((v:HTMLVideoElement) => v.currentTime)).toBeGreaterThan(88);
    await expect(page.getByText(/4% watched \(/)).toBeVisible();
    await cdp.detach();
  });
});

test('settings gear offers playback speeds with selection, keyboard and fullscreen support', async ({ page }) => {
  const posts: Array<{event:string;position_seconds:number}> = [];
  await protectedScrubPlayer(page, posts);
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await expect(page.getByRole('menu')).toHaveCount(0);
  await settings.click();
  await page.getByRole('menuitem', { name: /Playback speed.*Normal/ }).click();
  await expect(page.getByRole('menuitemradio', { name: 'Normal', exact: true })).toHaveAttribute('aria-checked', 'true');
  const narrowMenu = (await page.getByRole('menu').boundingBox())!;
  const narrowStage = (await page.getByTestId('protected-video-stage').boundingBox())!;
  expect(narrowMenu.y).toBeGreaterThanOrEqual(narrowStage.y);
  await page.getByRole('menuitemradio', { name: '1.75×', exact: true }).click();
  await expect(page.locator('video')).toHaveJSProperty('playbackRate', 1.75);
  await expect(page.getByRole('menu')).toHaveCount(0);
  await settings.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('menuitem', { name: /Playback speed/ }).press('Enter');
  await expect(page.getByRole('menuitemradio', { name: '1.75×', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('video')).toHaveJSProperty('playbackRate', 2);
  expect(posts.filter(p => p.event === 'seek')).toHaveLength(0);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await settings.click();
  await page.getByRole('menuitem', { name: /Playback speed/ }).click();
  await expect(page.getByRole('menuitemradio', { name: '2×', exact: true })).toHaveAttribute('aria-checked', 'true');
  const menu = (await page.getByRole('menu').boundingBox())!;
  const stage = (await page.getByTestId('protected-video-stage').boundingBox())!;
  expect(menu.y).toBeGreaterThanOrEqual(stage.y);
  expect(menu.y + menu.height).toBeLessThanOrEqual(stage.y + stage.height);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await settings.click();
  await page.getByRole('heading', { name: 'Scrubbing QA', exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('login shows company attribution and opens the canonical policy without losing the form', async ({ page }) => {
  await spaFallback(page);
  await page.route('https://www.ai4impact.in/privacy/', route => route.fulfill({ contentType: 'text/html', body: '<main>Published AI4Impact policy</main>' }));
  await page.goto('/login');
  await expect(page.getByText('Powered by Samagyaan Data solutions', { exact: true })).toBeVisible();
  await page.getByPlaceholder('your@email.com').fill('qa@example.invalid');
  const policy = page.getByRole('link', { name: 'Privacy Policy', exact: true });
  await expect(policy).toHaveAttribute('href', 'https://www.ai4impact.in/privacy/');
  const opened = page.waitForEvent('popup');
  await policy.click();
  const popup = await opened;
  await expect(popup).toHaveURL('https://www.ai4impact.in/privacy/');
  await popup.close();
  await expect(page.getByPlaceholder('your@email.com')).toHaveValue('qa@example.invalid');
});

test('Home and My learning previews do not initialize course access windows', async ({ page }) => {
  await seed(page); await spaFallback(page);
  const ids = [cid, eid]; const opened: string[] = [];
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (pathname === '/users/me') json = { id: cid, email: 'qa@example.invalid', name: 'QA learner', user_type: 'professional', designation: 'Engineer', company: 'QA' };
    if (pathname === '/me/learning') json = ids.map((id,i) => ({id,title:`Unopened course ${i+1}`,registration_status:'registered',total_recorded_lectures:1,completed_lectures:0}));
    if (ids.some(id => pathname === `/learning/courses/${id}`)) {
      const id=pathname.split('/').at(-1)!; opened.push(id);
      json={course:{id,title:'Unopened'},classes:[],completion:{progress_percentage:0,recorded_total:1,recorded_completed:0}};
    }
    await route.fulfill({json});
  });
  await page.goto('/');
  await expect(page.getByText('Open course', { exact: true }).first()).toBeVisible();
  expect(opened).toEqual([]);
  await page.goto('/learning');
  await expect(page.getByText('Unopened course 2',{exact:true}).last()).toBeVisible();
  await expect(page.getByText('Open course to see available lessons', { exact: true })).toHaveCount(2);
  expect(opened).toEqual([]);
  // Explicitly opening a course still loads its current server-authoritative detail.
  await page.getByRole('button', { name: 'Open course: Unopened course 1', exact: true }).click();
  await expect.poll(() => opened.includes(cid)).toBe(true);
  expect(opened).not.toContain(eid);
});

test('a replacement live poll accepts a new answer after the previous poll was answered', async ({ page }) => {
  await page.clock.install(); await seed(page); await spaFallback(page);
  let active=1; let votes=0; const votedPolls:string[]=[];
  const poll=(n:number) => ({id:n===1?cid:aid,event_id:eid,question:n===1?'First question':'Second question',status:'active',created_at:new Date().toISOString(),options:[{id:`answer-${n}`,poll_id:n===1?cid:aid,option_text:n===1?'First answer':'Second answer'}]});
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**',async route => {
    const pathname=new URL(route.request().url()).pathname;
    let json:unknown=[];
    if(pathname==='/users/me')json={id:cid,email:'qa@example.invalid',name:'QA learner',user_type:'professional',designation:'Engineer',company:'QA'};
    if(pathname==='/events')json=[{id:eid,name:'Live QA',status:'ongoing',visibility:'global',event_type:'online',start_time:new Date(Date.now()-600000).toISOString(),end_time:new Date(Date.now()+3600000).toISOString()}];
    if(pathname==='/attendance')json=[{event_id:eid}];
    if(pathname===`/events/${eid}/analytics`)json={event_id:eid,attendance_count:1,top_students:[],materials:{total:0},polls:{total_polls:2,total_votes:votes,participation_rate:50}};
    if(pathname==='/polls')json=[poll(active)];
    if(pathname.endsWith('/results'))json={results:[{option_id:'answer-1',option:'First answer',votes}]};
    if(pathname.endsWith('/vote')){votes++;votedPolls.push(pathname.split('/')[2]);json={success:true};}
    await route.fulfill({json});
  });
  await page.goto('/events');
  await page.getByRole('button',{name:'First answer',exact:true}).click();
  await expect(page.getByText(/you answered/)).toBeVisible();
  active=2;
  await page.clock.fastForward(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('Second question',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Second answer/})).toBeEnabled();
  await page.getByRole('button',{name:/Second answer/}).click();
  await expect.poll(() => votedPolls).toEqual([cid,aid]);
});

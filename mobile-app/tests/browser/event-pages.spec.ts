import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

// Browser event pages (event detail, poll, leaderboards, materials) over a mocked API.
// Set QA_SHOTS=<dir> to also save a screenshot of each page.

const client = '40faprqjpcc6q0pfkdkcrd8p5v';
const me = '00000000-0000-0000-0000-0000000000aa';
const evId = '00000000-0000-0000-0000-000000000010';
const ev2Id = '00000000-0000-0000-0000-000000000011';
const openPoll = '00000000-0000-0000-0000-000000000020';
const closedPoll = '00000000-0000-0000-0000-000000000021';
const matId = '00000000-0000-0000-0000-000000000030';

const hour = 3600_000;
const event = { id: evId, name: 'Applied AI Meetup', description: 'Talks and live polls on shipping AI features.', location: 'Bengaluru', event_type: 'hybrid', status: 'ongoing', start_time: new Date(Date.now() - hour).toISOString(), end_time: new Date(Date.now() + hour).toISOString(), created_at: new Date().toISOString() };
const event2 = { ...event, id: ev2Id, name: 'Data Engineering Panel', status: 'completed', start_time: new Date(Date.now() - 72 * hour).toISOString(), end_time: new Date(Date.now() - 70 * hour).toISOString() };
const poll = (id: string, status: string, question: string) => ({
  id, event_id: evId, status, question, created_at: new Date().toISOString(),
  options: [{ id: `${id}-a`, poll_id: id, option_text: 'Retrieval' }, { id: `${id}-b`, poll_id: id, option_text: 'Fine-tuning' }, { id: `${id}-c`, poll_id: id, option_text: 'Prompting' }],
});
const polls = [poll(closedPoll, 'closed', 'Which approach did the first talk recommend?'), poll(openPoll, 'active', 'What should we cover next?')];
const materials = [
  { id: matId, event_id: evId, title: 'Keynote slides', file_type: 'application/pdf', file_url: '', created_at: new Date().toISOString() },
  { id: `${matId.slice(0, -2)}31`, event_id: evId, title: 'Workshop notebook', file_type: 'application/zip', file_url: '', created_at: new Date().toISOString() },
];

async function setup(page: Page, opts: { joined?: boolean } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const token = (c: object) => `test.${Buffer.from(JSON.stringify({ sub: 'browser-qa', username: 'browser-qa', 'cognito:username': 'browser-qa', email: 'qa@example.invalid', iat: now, exp: now + 3600, ...c })).toString('base64url')}.test`;
  await page.addInitScript(({ client, id, access }) => {
    const p = `CognitoIdentityServiceProvider.${client}`;
    localStorage.setItem('auth_id_token', id);
    localStorage.setItem('auth_token', access);
    localStorage.setItem(`${p}.LastAuthUser`, 'browser-qa');
    for (const [k, v] of Object.entries({ idToken: id, accessToken: access, refreshToken: 'synthetic-qa-refresh', clockDrift: '0' })) localStorage.setItem(`${p}.browser-qa.${k}`, v);
    localStorage.setItem('user_data', JSON.stringify({ id: 'browser-qa', email: 'qa@example.invalid', name: 'QA learner', user_type: 'professional' }));
  }, { client, id: token({ token_use: 'id', aud: client }), access: token({ token_use: 'access', client_id: client }) });
  if (!process.env.QA_STUDENT_URL) {
    const index = path.join(__dirname, '../../dist/index.html');
    await page.route(u => u.host === '127.0.0.1:8765', r => (r.request().resourceType() === 'document' ? r.fulfill({ path: index, contentType: 'text/html' }) : r.continue()));
  }
  await page.route('https://cognito-idp.*.amazonaws.com/**', r => r.abort());

  const state = { joined: !!opts.joined, joins: 0, votes: [] as string[], downloads: 0 };
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const method = route.request().method();
    let json: unknown = [];
    if (p === '/users/me') json = { id: me, email: 'qa@example.invalid', name: 'QA learner', user_type: 'professional' };
    else if (p === '/events') json = [event, event2];
    else if (p === `/events/${evId}`) json = event;
    else if (p === `/events/${ev2Id}`) json = event2;
    else if (p === '/attendance') json = state.joined ? [{ id: 'att-1', event_id: evId }, { id: 'att-2', event_id: ev2Id }] : [];
    else if (p === `/events/${evId}/join` && method === 'POST') { state.joins++; state.joined = true; json = { ok: true }; }
    else if (p === '/polls') json = url.searchParams.get('event_id') === evId ? polls : [];
    else if (p.startsWith('/polls/') && p.endsWith('/vote') && method === 'POST') { state.votes.push(route.request().postDataJSON().option_id); json = { ok: true }; }
    else if (p.startsWith('/polls/') && p.endsWith('/results')) {
      const id = p.split('/')[2];
      const counted = id === openPoll && state.votes.length ? 1 : 0;
      json = { poll_id: id, results: [
        { option_id: `${id}-a`, option: 'Retrieval', votes: 6 + counted, is_correct: id === closedPoll },
        { option_id: `${id}-b`, option: 'Fine-tuning', votes: 3 },
        { option_id: `${id}-c`, option: 'Prompting', votes: 1 },
      ] };
    } else if (p.startsWith('/polls/')) json = polls.find(x => x.id === p.split('/')[2]) ?? {};
    else if (p === '/materials') json = url.searchParams.get('event_id') === evId ? materials : [];
    else if (p.startsWith('/materials/') && p.endsWith('/download')) { state.downloads++; json = { material_id: matId, download_url: 'https://files.example.invalid/keynote.pdf', expires_in: 300 }; }
    else if (p.endsWith('/analytics')) json = {
      event_id: evId, attendance_count: 42, average_engagement_score: 61,
      top_students: [
        { user_id: 'u1', display_name: 'Asha Rao', score: 180, total_actions: 6 },
        { user_id: me, display_name: 'QA learner', score: 120, total_actions: 4 },
        { user_id: 'u3', display_name: 'Vikram Shah', score: 80, total_actions: 3 },
      ],
    };
    return route.fulfill({ json });
  });
  // Downloads open a new tab pointed at the signed URL; keep it offline.
  await page.context().route('https://files.example.invalid/**', r => r.fulfill({ body: 'pdf', contentType: 'application/pdf' }));
  return state;
}

const shot = async (page: Page, name: string) => {
  if (process.env.QA_SHOTS) await page.screenshot({ path: path.join(process.env.QA_SHOTS, `${name}.png`), fullPage: true });
};

for (const width of [1280, 390]) {
  test(`event detail at ${width}px: join, answer a poll in place, closed poll shows the correct answer`, async ({ page }) => {
    const state = await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/events/${evId}`);

    await expect(page.getByRole('heading', { name: event.name, level: 1 })).toBeVisible();
    // Home stays mounted under the stack; only the visible copy belongs to this page.
    await expect(page.getByText('Live now', { exact: true }).locator('visible=true')).toBeVisible();
    // Closed poll: results with the correct answer marked, no answer controls.
    await expect(page.getByLabel('Retrieval, 60%, correct answer')).toBeVisible();
    await shot(page, `event-detail-${width}`);

    await page.getByRole('button', { name: 'Join event' }).click();
    await expect(page.getByText('You are attending', { exact: true })).toBeVisible();
    expect(state.joins).toBe(1);

    // Open poll: pick, submit, then results replace the choices.
    await page.getByRole('radio', { name: 'Prompting' }).click();
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Answer recorded. Points are added to the event leaderboard.', { exact: true })).toBeVisible();
    expect(state.votes).toEqual([`${openPoll}-c`]);
    await expect(page.getByRole('radio')).toHaveCount(0);

    // Leaderboard preview marks the signed-in learner.
    await expect(page.getByText('You', { exact: true }).first()).toBeVisible();
    await shot(page, `event-detail-joined-${width}`);
  });
}

test('poll page deep link: answer, see results, breadcrumb returns to its event', async ({ page }) => {
  const state = await setup(page, { joined: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/polls/${openPoll}`);
  await expect(page.getByRole('heading', { name: 'What should we cover next?' })).toBeVisible();
  const submit = page.getByRole('button', { name: 'Submit answer' });
  await expect(submit).toBeDisabled();
  await page.getByRole('radio', { name: 'Retrieval' }).click();
  await shot(page, 'poll-answer');
  await submit.click();
  await expect(page.getByLabel('Retrieval, 64%, your answer')).toBeVisible();
  expect(state.votes).toEqual([`${openPoll}-a`]);
  await shot(page, 'poll-results');
  await page.getByRole('link', { name: 'Back to event' }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${evId}$`));
});

test('leaderboards: joined events list, per-event board with your rank, switching boards updates the URL', async ({ page }) => {
  await setup(page, { joined: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/leaderboards');
  await expect(page.getByRole('heading', { name: 'Leaderboards', level: 1 })).toBeVisible();
  // Most recent joined event is selected by default.
  await expect(page.getByRole('heading', { name: event.name, level: 2 })).toBeVisible();
  await expect(page.getByText('#2', { exact: true })).toBeVisible();
  await shot(page, 'leaderboards-1280');
  await page.getByRole('button', { name: `${event2.name} leaderboard` }).click();
  await expect(page).toHaveURL(new RegExp(`/leaderboards/${ev2Id}$`));
  await expect(page.getByRole('heading', { name: event2.name, level: 2 })).toBeVisible();
});

test('leaderboards at 390px show the list first, then one board', async ({ page }) => {
  await setup(page, { joined: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/leaderboards');
  await expect(page.getByRole('button', { name: `${event.name} leaderboard` })).toBeVisible();
  await expect(page.getByText('Your rank', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `${event.name} leaderboard` }).click();
  await expect(page.getByText('Your rank', { exact: true })).toBeVisible();
  await shot(page, 'leaderboard-390');
});

test('event materials: download opens the signed link in a new tab and is marked downloaded', async ({ page }) => {
  const state = await setup(page, { joined: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/events/${evId}/materials`);
  await expect(page.getByRole('heading', { name: 'Materials', level: 1 })).toBeVisible();
  await expect(page.getByText('+20 pts', { exact: true }).first()).toBeVisible();
  // The tab opens on the click itself (popup blockers allow that), then loads the signed URL.
  const popup = page.waitForEvent('popup');
  const fileRequest = page.context().waitForEvent('request', r => r.url() === 'https://files.example.invalid/keynote.pdf');
  await page.getByRole('button', { name: 'Download Keynote slides' }).click();
  await popup;
  await fileRequest;
  await expect(page.getByText('Downloaded', { exact: true })).toBeVisible();
  expect(state.downloads).toBe(1);
  await shot(page, 'materials-1280');
});

test('event materials prompt to join when the learner has not joined', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/events/${evId}/materials`);
  await expect(page.getByText('Join this event to download its materials and earn points.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go to event' }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${evId}$`));
});

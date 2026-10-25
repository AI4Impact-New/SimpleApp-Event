import { test, expect, Page } from '@playwright/test';

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
  await page.goto('/');
  await page.getByRole('tab', { name: /Profile/ }).click();
  await page.getByText('Edit Profile', { exact: true }).click();
  await page.getByPlaceholder('Your name').fill('Updated learner');
  await page.getByText('Save Profile', { exact: true }).click();
  await expect(page.getByText('Updated learner', { exact: true }).first()).toBeVisible();
  expect(saves).toBe(1);
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
  await page.getByRole('tab', { name: /My Learning/ }).click();
  await page.getByText(course.title, { exact: true }).last().click();
  await page.getByText(exam.title, { exact: true }).click();
  await page.getByText('Start / resume exam', { exact: true }).click();
  await page.getByText('Correct answer', { exact: true }).click();
  await page.getByText('Submit (1/1 answered)', { exact: true }).click();
  await expect(page.getByText('Passed', { exact: true })).toBeVisible();
  expect(submissions).toBe(1);
});

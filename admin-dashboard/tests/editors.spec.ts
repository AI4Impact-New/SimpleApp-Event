import { test, expect, Page } from '@playwright/test';
import { pick } from './select';

const cid = '00000000-0000-0000-0000-000000000001';
const shots = process.env.QA_SCREENSHOTS;

async function open(page: Page, saved: { exam?: Record<string, unknown>; klass?: Record<string, unknown> }) {
  const payload = Buffer.from(JSON.stringify({ token_use: 'id', sub: 'test-admin', 'cognito:groups': ['Admins'], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await page.addInitScript(token => localStorage.setItem('auth_id_token', token), `test.${payload}.test`);
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const url = new URL(route.request().url()); let json: unknown = [];
    const method = route.request().method();
    if (url.pathname === `/courses/${cid}`) json = { id: cid, title: 'Azure Data Engineering' };
    if (url.pathname.endsWith('/completion-rules')) json = { require_recorded: true };
    if (method === 'POST' && url.pathname.endsWith('/exams')) { saved.exam = route.request().postDataJSON(); json = { id: 'e1' }; }
    if (method === 'POST' && url.pathname.endsWith('/classes')) { saved.klass = route.request().postDataJSON(); json = { id: 'k1' }; }
    await route.fulfill({ json });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${process.env.QA_ADMIN_URL || 'http://localhost:3100'}/dashboard/learning/${cid}`);
}

test('assessment builder: paste, mark correct, validate, then publish', async ({ page }) => {
  const saved: { exam?: Record<string, unknown> } = {};
  await open(page, saved);
  await page.getByRole('button', { name: 'Assessments', exact: true }).click();
  await page.getByRole('button', { name: 'New assessment' }).first().click();
  const editor = page.getByRole('region', { name: 'Assessment editor' });
  await editor.getByLabel('Assessment title').fill('Module 1 quiz');

  await editor.getByRole('button', { name: 'Paste questions' }).click();
  await editor.getByLabel('Pasted questions').fill('1. What does ADF orchestrate?\nA) Virtual machines\n*B) Data pipelines\nC) DNS\n\n2) Which format is columnar?\nA. CSV\nB. JSON\nC. Parquet\nAnswer: C');
  await expect(editor.getByText('2 questions detected')).toBeVisible();
  await editor.getByRole('button', { name: 'Add 2 questions' }).click();
  await expect(editor.getByLabel('Question 1 text')).toHaveValue('What does ADF orchestrate?');
  await expect(editor.getByRole('button', { name: 'Question 1 correct answer B' })).toHaveAttribute('aria-pressed', 'true');

  await editor.getByRole('button', { name: 'Add question' }).click();
  await editor.getByLabel('Question 3 text').fill('Pick the batch service');
  await editor.getByLabel('Question 3 option A').fill('Databricks');
  await expect(editor.getByText(/1 question needs attention: Q3 \(empty option\)/)).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/5-assessment.png` });
  const bar = await editor.getByRole('button', { name: 'Save & publish' }).boundingBox();
  expect(bar!.y + bar!.height).toBeLessThanOrEqual(900); // action bar stays on screen
  await editor.getByRole('button', { name: 'Save & publish' }).click();
  await expect(editor.getByRole('alert')).toContainText('Finish question 3');

  await editor.getByLabel('Question 3 option B').fill('Event Hubs');
  await editor.getByRole('button', { name: 'Remove option D' }).click();
  await editor.getByRole('button', { name: 'Remove option C' }).click();
  await editor.getByRole('button', { name: 'Question 3 correct answer A' }).click();
  await editor.getByRole('button', { name: 'Save & publish' }).click();
  await expect(page.getByRole('status')).toContainText('published');
  const questions = saved.exam?.questions as { question: string; correct_option_id: string; options: unknown[] }[];
  expect(saved.exam?.published).toBe(true);
  expect(questions.map(q => [q.question, q.correct_option_id, q.options.length])).toEqual([
    ['What does ADF orchestrate?', 'b', 3], ['Which format is columnar?', 'c', 3], ['Pick the batch service', 'a', 2],
  ]);
});

test('class editor schedules a live session from date, time and duration', async ({ page }) => {
  const saved: { klass?: Record<string, unknown> } = {};
  await open(page, saved);
  await page.getByRole('button', { name: 'Schedule live session' }).click();
  const editor = page.getByRole('region', { name: 'Class editor' });
  await editor.getByLabel('Title').fill('Week 3 live Q&A');
  await editor.getByLabel('Date').fill('2026-12-01');
  await editor.getByLabel('Start time').fill('18:30');
  await pick(editor.getByLabel('Duration'), '90');
  await editor.getByLabel('Meeting link').fill('https://zoom.us/j/123');
  await expect(editor.getByText(/Ends at 8:00/)).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/6-class.png` });
  await editor.getByRole('button', { name: 'Schedule session' }).click();
  await expect(page.getByRole('status')).toContainText('Session scheduled');
  expect(saved.klass).toMatchObject({ title: 'Week 3 live Q&A', class_type: 'online', duration_minutes: 90, zoom_link: 'https://zoom.us/j/123' });
  const start = new Date(saved.klass!.start_time as string), end = new Date(saved.klass!.end_time as string);
  expect(end.getTime() - start.getTime()).toBe(90 * 60000);
  expect(start.getHours()).toBe(18);
});

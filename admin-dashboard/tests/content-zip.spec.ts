import { test, expect } from '@playwright/test';
import { pick } from './select';
import { ZipWriter, Uint8ArrayWriter, TextReader, configure } from '@zip.js/zip.js';

const cid = '00000000-0000-0000-0000-000000000001';
const shots = process.env.QA_SCREENSHOTS;

async function courseZip() {
  configure({ useWebWorkers: false });
  const writer = new ZipWriter(new Uint8ArrayWriter());
  const files = [
    'Azure Course/01 Foundations/01 - Data Engineering Introduction.mp4',
    'Azure Course/01 Foundations/01 - Data Engineering Introduction notes.pdf',
    'Azure Course/01 Foundations/02_SQL Basics/lecture.mp4',
    'Azure Course/01 Foundations/02_SQL Basics/slides.pptx',
    'Azure Course/01 Foundations/02_SQL Basics/queries.sql',
    'Azure Course/01 Foundations/syllabus.pdf',
    'Azure Course/02 Pipelines/10 Orchestration.mp4',
    'Azure Course/02 Pipelines/2 Data Factory.mp4',
    'Azure Course/02 Pipelines/2 Data Factory lab.ipynb',
    'Azure Course/02 Pipelines/03 Reading list.docx',
    'Azure Course/.DS_Store',
    '__MACOSX/Azure Course/._syllabus.pdf',
  ];
  for (const name of files) await writer.add(name, new TextReader(`fixture ${name}`));
  return Buffer.from(await writer.close());
}

test('course ZIP becomes an editable module → lecture → material outline', async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ token_use: 'id', sub: 'test-admin', 'cognito:groups': ['Admins'], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await page.addInitScript(token => localStorage.setItem('auth_id_token', token), `test.${payload}.test`);
  let reset: unknown = null;
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const url = new URL(route.request().url()); let json: unknown = [];
    if (url.pathname === `/courses/${cid}`) json = { id: cid, title: 'Azure Data Engineering' };
    if (url.pathname.endsWith('/completion-rules')) json = { require_recorded: true };
    if (url.pathname.endsWith('/classes')) json = [
      { id: 'c1', course_id: cid, title: 'Data Engineering Introduction', class_type: 'recorded', duration_minutes: 30, sort_order: 0, video_status: 'ready', completed: false },
      { id: 'c2', course_id: cid, title: 'SQL Basics', class_type: 'recorded', duration_minutes: 30, sort_order: 1, completed: false },
    ];
    if (url.pathname.endsWith('/learners')) json = [{ user_id: 'u1', name: 'Asha Rao', email: 'asha@example.invalid', status: 'registered', lectures_completed: 1, exams_passed: 0, certified: false }];
    if (url.pathname.endsWith('/video-analytics')) json = { videos: [], students: [], total_students: 0, student_limit: 500 };
    if (url.pathname.endsWith('/access-reset')) { reset = { path: url.pathname, body: route.request().postDataJSON() }; json = {}; }
    await route.fulfill({ json });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${process.env.QA_ADMIN_URL || 'http://localhost:3100'}/dashboard/learning/${cid}`);

  await expect(page.getByRole('heading', { name: 'Course content' })).toBeVisible();
  await expect(page.getByText('Sequential video access')).toHaveCount(0);
  if (shots) await page.screenshot({ path: `${shots}/1-content.png`, fullPage: true });

  await page.getByLabel('Course ZIP file').setInputFiles({ name: 'Azure Course.zip', mimeType: 'application/zip', buffer: await courseZip() });
  const draft = page.getByRole('region', { name: 'ZIP import preview' });
  await expect(draft.getByText('2 modules · 4 lectures · 6 materials')).toBeVisible();
  await expect(draft.getByLabel('Module 1 title')).toHaveValue('Foundations');
  await expect(draft.getByLabel('Module 2 title')).toHaveValue('Pipelines');
  // Natural sort: "2 Data Factory" before "10 Orchestration"; number prefixes stripped.
  const titles = await draft.getByLabel(/^Lecture \d+ title$/).evaluateAll(els => els.map(el => (el as HTMLInputElement).value));
  expect(titles).toEqual(['Data Engineering Introduction', 'SQL Basics', 'Data Factory', 'Orchestration']);
  await expect(draft.getByText('01 - Data Engineering Introduction notes.pdf')).toBeVisible();
  await expect(draft.getByText('queries.sql')).toBeVisible();
  await expect(draft.getByText('2 Data Factory lab.ipynb')).toBeVisible();
  await expect(draft.getByText('syllabus.pdf', { exact: true })).toBeVisible();
  await expect(draft.getByText(/2 system files were skipped/)).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/2-draft.png`, fullPage: true });

  await draft.getByRole('button', { name: 'Move Orchestration up' }).click();
  await draft.getByLabel('Lecture 1 title').first().fill('Welcome to the course');
  await draft.getByRole('button', { name: 'Remove queries.sql' }).click();
  await expect(draft.getByText('queries.sql')).toHaveCount(0);
  await expect(draft.getByText('2 modules · 4 lectures · 5 materials')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  if (shots) await page.screenshot({ path: `${shots}/3-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole('button', { name: /^Learners/ }).click();
  await pick(page.getByLabel('Reset access learner'), 'u1');
  await pick(page.getByLabel('Reset access recording'), 'c2');
  await page.getByRole('button', { name: 'Reopen for 7 days' }).click();
  await expect(page.getByRole('status')).toContainText('Video reopened');
  expect(reset).toEqual({ path: '/admin/classes/c2/access-reset', body: { user_id: 'u1' } });
  if (shots) await page.screenshot({ path: `${shots}/4-learners.png`, fullPage: true });
});

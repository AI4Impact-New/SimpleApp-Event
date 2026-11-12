import { test, expect, Page } from '@playwright/test';
import { pick } from './select';

const shots = process.env.QA_SCREENSHOTS;
const ev = { id: 'ev1', name: 'Annual Tech Workshop', description: 'Hands-on', location: 'Hall A', event_type: 'offline', status: 'draft', visibility: 'global', max_attendees: 50, start_time: '2026-12-01T04:30:00Z', end_time: '2026-12-01T08:30:00Z', created_at: '2026-11-01T00:00:00Z' };

async function open(page: Page, path: string, calls: { method: string; path: string; body: any }[]) {
  const payload = Buffer.from(JSON.stringify({ token_use: 'id', sub: 'test-admin', 'cognito:groups': ['Admins'], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await page.addInitScript(token => localStorage.setItem('auth_id_token', token), `test.${payload}.test`);
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const url = new URL(route.request().url()); const method = route.request().method();
    let json: unknown = [];
    if (method !== 'GET') calls.push({ method, path: url.pathname, body: route.request().postDataJSON() });
    if (url.pathname === '/events') json = method === 'GET' ? [ev] : { ...ev, id: 'ev2' };
    if (url.pathname === '/events/ev1') json = ev;
    if (url.pathname === '/materials') json = { materials: [{ id: 'm1', title: 'Slides deck' }] };
    if (url.pathname === '/polls' && method === 'POST') json = { id: 'p1' };
    await route.fulfill({ json });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${process.env.QA_ADMIN_URL || 'http://localhost:3100'}${path}`);
}

test('event form opens on the page, creates and edits events', async ({ page }) => {
  const calls: { method: string; path: string; body: any }[] = [];
  await open(page, '/dashboard/events', calls);
  await page.getByRole('button', { name: 'Create Event' }).click();
  const editor = page.getByRole('region', { name: 'Event editor' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await editor.getByLabel('Event name').fill('Data Day');
  await editor.getByText('Hybrid', { exact: true }).click();
  await editor.getByLabel('Starts').fill('2026-12-05T10:00');
  await editor.getByLabel('Ends').fill('2026-12-05T09:00');
  await editor.getByText('Private', { exact: true }).click();
  await editor.getByRole('button', { name: 'Create event' }).click();
  await expect(editor.getByRole('alert')).toContainText('End time must be after');
  await editor.getByLabel('Ends').fill('2026-12-05T13:00');
  if (shots) await page.screenshot({ path: `${shots}/7-event.png` });
  await editor.getByRole('button', { name: 'Create event' }).click();
  await expect(editor).toHaveCount(0);
  expect(calls[0]).toMatchObject({ method: 'POST', path: '/events', body: { name: 'Data Day', event_type: 'hybrid', visibility: 'private', max_attendees: 100, start_time: '2026-12-05T04:30:00.000Z', end_time: '2026-12-05T07:30:00.000Z' } });

  await page.getByRole('button', { name: /edit/i }).first().click();
  await expect(editor.getByLabel('Event name')).toHaveValue('Annual Tech Workshop');
  await pick(editor.getByLabel('Status'), 'published');
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expect(editor).toHaveCount(0);
  expect(calls[1]).toMatchObject({ method: 'PUT', path: '/events/ev1', body: { name: 'Annual Tech Workshop', status: 'published', event_type: 'offline' } });
});

test('poll form opens on the page and maps the correct answer past blank options', async ({ page }) => {
  const calls: { method: string; path: string; body: any }[] = [];
  await open(page, '/dashboard/polls', calls);
  await pick(page.getByLabel('Select Event'), 'ev1');
  await page.getByRole('button', { name: 'Create Poll' }).first().click();
  const editor = page.getByRole('region', { name: 'Poll editor' });
  await expect(editor.getByText('Annual Tech Workshop')).toBeVisible();
  await editor.getByLabel('Question').fill('Which cloud do you use?');
  await editor.getByLabel('Option A', { exact: true }).fill('Azure');
  await editor.getByLabel('Option A', { exact: true }).press('Enter');
  await editor.getByLabel('Option B', { exact: true }).press('Enter'); // leaves B blank, adds C
  await expect(editor.getByLabel('Option C', { exact: true })).toBeFocused();
  await editor.getByLabel('Option C', { exact: true }).fill('AWS');
  await editor.getByRole('button', { name: 'Mark option C correct' }).click();
  await pick(editor.getByLabel('Related material'), 'm1');
  if (shots) await page.screenshot({ path: `${shots}/8-poll.png` });
  await editor.getByRole('button', { name: 'Create poll' }).click();
  await expect(editor).toHaveCount(0);
  expect(calls[0]).toMatchObject({ method: 'POST', path: '/polls', body: { event_id: 'ev1', question: 'Which cloud do you use?', options: ['Azure', 'AWS'], correct_option_index: 1, material_id: 'm1' } });
});

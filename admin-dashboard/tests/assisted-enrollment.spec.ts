import { test, expect } from '@playwright/test';

test('a website enquiry saves only student-profile fields, including after reopening', async ({ page }) => {
  const lead = {
    id: '00000000-0000-0000-0000-000000000001', kind: 'guidance',
    name: 'Example Learner', email: 'learner@example.invalid', phone: '+919000000000',
    interest: 'AI engineering', consent: true, consent_at: '2026-10-21T09:00:00Z',
    consent_version: 'guidance-contact-v1', source_page: '/', status: 'new', notes: '',
    created_at: '2026-10-21T09:00:00Z', updated_by: null,
  };
  const fields = ['name', 'email', 'phone', 'user_type', 'university', 'course', 'year_of_study', 'city', 'state', 'designation', 'company'];
  let saved: Record<string, unknown> | null = null;
  let invalid: string[] = [];
  const payload = Buffer.from(JSON.stringify({ token_use: 'id', sub: 'browser-test', 'cognito:groups': ['Marketing'], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await page.addInitScript(token => localStorage.setItem('auth_id_token', token), `test.${payload}.test`);
  // Every API request is intercepted: this synthetic token never reaches AWS.
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === '/admin/enquiries') body = { enquiries: [lead], total: 1, offset: 0, limit: 50 };
    if (url.pathname.endsWith('/assisted')) {
      if (route.request().method() === 'PUT') {
        const request = route.request().postDataJSON();
        invalid = Object.keys(request).filter(key => ![...fields, 'account_authorized'].includes(key));
        if (invalid.length) return route.fulfill({ status: 400, json: { error: 'Unknown student profile field' } });
        saved = request;
        body = { saved: true };
      } else body = { lead, enrollment: saved ? { profile: saved, user_id: null, account_created_here: false } : null, quotes: [], actions: [], quote_email_enabled: false };
    }
    await route.fulfill({ json: body });
  });
  await page.goto(`${process.env.QA_ADMIN_URL || 'http://localhost:3100'}/dashboard/course-enquiries`);
  await page.getByRole('button', { name: 'Open student workspace' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Automatic quote email awaits Resend sender and API key setup/)).toBeVisible();
  await expect(dialog.getByLabel('Full name', { exact: true })).toHaveValue(lead.name);
  for (const label of ['City', 'State', 'University', 'Degree / course of study', 'Year of study']) {
    await dialog.getByLabel(label, { exact: true }).fill('Example');
  }
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Save student details' }).click();
  await expect(dialog.getByText('Student details saved. Course access remains unchanged.')).toBeVisible();
  expect(invalid).toEqual([]);
  expect(saved).toEqual(expect.objectContaining({ name: lead.name, account_authorized: true }));
  await expect(dialog.getByRole('button', { name: 'Close student workspace' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Close student workspace' }).click();
  await page.getByRole('button', { name: 'Open student workspace' }).click();
  await expect(dialog.getByLabel('City', { exact: true })).toHaveValue('Example');
  await dialog.getByLabel('Profile type').selectOption('professional');
  await dialog.getByLabel('Designation', { exact: true }).fill('Engineer');
  await dialog.getByLabel('Company', { exact: true }).fill('Example Company');
  await dialog.getByRole('button', { name: 'Save student details' }).click();
  await expect(dialog.getByText('Student details saved. Course access remains unchanged.')).toBeVisible();
  expect(invalid).toEqual([]);
  expect(saved).toEqual(expect.objectContaining({ user_type: 'professional', company: 'Example Company' }));
});

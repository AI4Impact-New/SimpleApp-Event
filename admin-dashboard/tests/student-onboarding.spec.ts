import { test, expect } from '@playwright/test';
import { pick } from './select';

const base = process.env.QA_ADMIN_URL || 'http://localhost:3100';
const course = '00000000-0000-0000-0000-00000000c001';
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const lead = (n: number, name: string) => ({ id: id(n), kind: 'guidance', name, email: `learner${n}@example.invalid`, phone: '+919000000000', interest: 'AI engineering', status: 'contacted', created_at: '2026-11-01T09:00:00Z' });
const leads = [lead(1, 'Example Invitee'), lead(2, 'Example Quoted'), lead(3, 'Example Planner'), lead(4, 'Example Graduate')];
const profile = { name: 'Example Quoted', email: 'learner2@example.invalid', phone: '+919000000000', user_type: 'professional', university: '', course: '', year_of_study: '', city: 'Pune', state: 'Maharashtra', designation: 'QA Engineer', company: 'Example Co' };
const quote = (n: number) => ({ id: id(100 + n), user_id: id(200 + n), course_id: course, course_title: 'Applied AI Engineer', buyer_email: `learner${n}@example.invalid`, buyer_name: 'Example', marked_price_paise: 5499900, discount_bps: 0, total_paise: 5499900, checkout_url: 'https://example.invalid/checkout', expires_at: '2026-12-01T00:00:00Z', status: 'pending', created_at: '2026-11-05T00:00:00Z' });
const actions = [{ action: 'invitation', state: 'accepted', created_at: '2026-11-04T18:30:00Z' }, { action: 'profile_saved', state: 'accepted', created_at: '2026-11-03T18:30:00Z' }];
const workspace: Record<string, unknown> = {
  [id(1)]: { lead: leads[0], enrollment: { user_id: null, profile: { ...profile, name: leads[0].name, email: leads[0].email }, account_created_here: false }, quotes: [], actions: [], quote_email_enabled: false },
  [id(2)]: { lead: leads[1], enrollment: { user_id: id(202), profile, account_created_here: true }, quotes: [], actions, quote_email_enabled: false },
  [id(3)]: { lead: leads[2], enrollment: { user_id: id(203), profile, account_created_here: true }, quotes: [quote(3)], actions, quote_email_enabled: false },
  [id(4)]: { lead: leads[3], enrollment: { user_id: id(204), profile, account_created_here: true }, quotes: [quote(4)], actions, quote_email_enabled: false },
};
const batch = { id: id(300), course_id: course, code: 'AAML-PN-NOV26', trainer_name: 'Example Trainer', starts_on: '2026-11-05' };
const account = { id: id(400), user_id: id(204), course_id: course, course_title: 'Applied AI Engineer', batch_code: 'AAML-PN-NOV26', total_paise: 5499900, paid_paise: 0, installments: [{ number: 1, amount_paise: 5499900, adjusted_amount_paise: 5499900, due_on: '2026-11-10', paid_paise: 0, outstanding_paise: 5499900, overdue_days: 0 }] };

test('student onboarding tracks each learner through the four steps', async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ token_use: 'id', sub: 'browser-test', 'cognito:groups': ['Admins'], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await page.addInitScript(token => localStorage.setItem('auth_id_token', token), `test.${payload}.test`);
  let planBody: Record<string, unknown> | null = null;
  // Every API request is intercepted: this synthetic token never reaches AWS.
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const url = new URL(route.request().url());
    let json: unknown = [];
    if (url.pathname === '/admin/enquiries') json = { enquiries: leads, total: leads.length, offset: 0, limit: 50 };
    else if (url.pathname.endsWith('/assisted')) json = workspace[url.pathname.split('/')[3]];
    else if (url.pathname === '/admin/billing/ledger') json = { mode: 'test', accounts: [account], batches: [batch], courses: [] };
    else if (url.pathname === '/admin/billing/ledger/accounts' && route.request().method() === 'POST') { planBody = route.request().postDataJSON(); json = { id: id(401) }; }
    else if (url.pathname === '/billing/catalog') json = [{ id: course, title: 'Applied AI Engineer', marked_price_paise: 5499900, discount_percentage: 0 }];
    await route.fulfill({ json });
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${base}/dashboard/onboarding`);

  await expect(page.getByRole('heading', { name: 'Student onboarding' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Student onboarding' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: /In progress 3/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Complete 1/ })).toBeVisible();

  // The first learner opens on the account step because details are saved.
  await expect(page.getByRole('tab', { name: /2\. Account invitation/ })).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: 'test-results/onboarding-account.png', fullPage: true });

  await page.getByRole('button', { name: /Example Quoted/ }).click();
  await expect(page.getByRole('tab', { name: /3\. Personal quote/ })).toHaveAttribute('aria-selected', 'true');
  await pick(page.getByLabel('Batch', { exact: true }), batch.id);
  await expect(page.getByText(/Total:\s*₹54,999\.00/)).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-quote.png', fullPage: true });
  await page.getByRole('tab', { name: /4\. Instalment plan/ }).click();
  await expect(page.getByText('Create a personal quote first')).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-plan-empty.png', fullPage: true });
  await page.getByRole('button', { name: 'Go to personal quote' }).click();
  await expect(page.getByRole('tab', { name: /3\. Personal quote/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /1\. Student details/ }).click();
  await expect(page.getByLabel('Company / college')).toHaveValue('Example Co');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-details.png', fullPage: true });

  await page.getByRole('button', { name: /Plan pending 1/ }).click();
  await page.getByRole('button', { name: /3 monthly/ }).click();
  await page.getByRole('button', { name: 'Agree instalment plan' }).click();
  await expect.poll(() => planBody).toEqual(expect.objectContaining({ user_id: id(203), course_id: course, mode: 'test' }));
  expect((planBody!.installments as { amount_paise: number }[]).reduce((n, i) => n + i.amount_paise, 0)).toBe(5499900);

  await page.getByRole('button', { name: /Complete 1/ }).click();
  await expect(page.getByText('Agreed instalment plan')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

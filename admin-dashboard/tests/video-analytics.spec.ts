import { test, expect } from '@playwright/test';
const cid = '00000000-0000-0000-0000-000000000001';
const vid = '00000000-0000-0000-0000-000000000002';
test('video summaries, learner resume, refresh and retry remain distinct', async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ token_use: 'id', sub: 'test-admin', 'cognito:groups': ['Admins'], exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
  await page.addInitScript(token => localStorage.setItem('auth_id_token', token), `test.${payload}.test`);
  let fail = false;
  await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**', async route => {
    const url = new URL(route.request().url()); let json: unknown = [];
    if (url.pathname === `/courses/${cid}`) json = {id:cid,title:'QA viewing course'};
    if (url.pathname.endsWith('/completion-rules')) json = {require_recorded:true};
    if (url.pathname.endsWith('/video-analytics')) {
      if (fail) return route.fulfill({status:500,json:{error:'Metrics temporarily unavailable'}});
      json = { videos:[{class_id:vid,title:'QA recording',duration_seconds:600,students_started:2,students_completed:1,watched_seconds:690}], students:url.searchParams.has('class_id') ? [
        {user_id:cid,name:'Rewound learner',email:'learner@example.invalid',watched_seconds:90,resume_seconds:40,progress_percentage:15,completed:false,last_progress_at:'2026-10-21T10:00:00Z'},
        {user_id:vid,name:'Not started learner',email:'new@example.invalid',watched_seconds:0,resume_seconds:0,progress_percentage:0,completed:false}
      ]:[],total_students:url.searchParams.has('class_id')?2:0,student_limit:500};
    }
    await route.fulfill({json});
  });
  await page.goto(`${process.env.QA_ADMIN_URL || 'http://localhost:3100'}/dashboard/learning/${cid}`);
  await page.getByRole('button',{name:'Learners',exact:true}).click();
  const panel = page.getByRole('region',{name:'Video viewing analytics'});
  await expect(panel.getByText('Total credited watch time: 11.5 minutes')).toBeVisible();
  await panel.getByLabel('Per-learner video progress').selectOption(vid);
  const row = panel.getByRole('row').filter({hasText:'Rewound learner'});
  await expect(row.getByText('1.5',{exact:true})).toBeVisible();
  await expect(row.getByText('15.0%',{exact:true})).toBeVisible();
  await expect(row.getByText('0:40',{exact:true})).toBeVisible();
  await expect(panel.getByRole('row').filter({hasText:'Not started learner'}).getByText('Not started',{exact:true})).toBeVisible();
  fail=true; await panel.getByRole('button',{name:'Refresh metrics'}).click();
  await expect(panel.getByRole('alert')).toContainText('Metrics temporarily unavailable');
  fail=false; await panel.getByRole('button',{name:'Reload recording list'}).click();
  await expect(panel.getByText('Total credited watch time: 11.5 minutes')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth+1)).toBeTruthy();
});

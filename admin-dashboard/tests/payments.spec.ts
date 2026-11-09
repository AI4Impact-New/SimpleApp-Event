import {test,expect} from '@playwright/test';
const cid='00000000-0000-0000-0000-000000000001';
const oid='00000000-0000-0000-0000-000000000002';
test('admin distinguishes test payments from demo orders and creates buyer checkout links',async({page})=>{
 const payload=Buffer.from(JSON.stringify({token_use:'id',sub:'test-admin','cognito:groups':['Admins'],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 await page.addInitScript(token=>localStorage.setItem('auth_id_token',token),`test.${payload}.test`);
 const order={id:oid,course_id:cid,course_title:'Payment QA',buyer_email:'qa@example.invalid',total_paise:9000,status:'paid',demo:false,mode:'test',provider_payment_id:'pay_QA',checkout_url:`https://learn.ai4impact.in/checkout/${oid}`};
 let created:any;
 await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**',async route=>{
  const path=new URL(route.request().url()).pathname;let json:unknown=[];
  if(path==='/admin/billing/courses')json=[{id:cid,title:'Payment QA',marked_price_paise:10000,discount_percentage:10,discount_paise:1000,total_paise:9000,currency:'INR'}];
  if(path==='/admin/billing/orders'){
   if(route.request().method()==='POST'){created=route.request().postDataJSON();json=order;}else json=[order,{...order,id:cid,status:'demo_completed',demo:true,provider_payment_id:undefined}];
  }
  await route.fulfill({json});
 });
 await page.goto(`${process.env.QA_ADMIN_URL||'http://localhost:3100'}/dashboard/fees`);
 await expect(page.getByRole('heading',{name:'Orders & receipts'})).toBeVisible();
 await expect(page.getByRole('cell').filter({hasText:'paid · test'})).toContainText('pay_QA');
 await expect(page.getByRole('cell').filter({hasText:'demo_completed · legacy demo'})).toBeVisible();
 await page.getByLabel('Payment link course').selectOption(cid);
 await page.locator('input[type=email]').fill('qa@example.invalid');
 await page.getByRole('button',{name:'Create payment link',exact:true}).click();
 await expect(page.getByLabel('Generated payment link')).toHaveValue(order.checkout_url);
 expect(created.course_id).toBe(cid);expect(created.buyer_email).toBe('qa@example.invalid');expect(created.request_id).toMatch(/^[a-f0-9-]{36}$/);
});

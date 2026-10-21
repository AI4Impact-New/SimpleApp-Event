import { test, expect } from '@playwright/test';
const base=process.env.QA_ADMIN_URL||'http://localhost:3100';

test('sign-in errors and password recovery stay on the application origin',async({page})=>{
  let resets=0,confirmations=0;
  const documents:string[]=[];
  page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents.push(request.url());});
  await page.route('https://cognito-idp.ap-south-1.amazonaws.com/**',async route=>{
    const target=route.request().headers()['x-amz-target']||'';
    if(target.endsWith('InitiateAuth'))return route.fulfill({status:400,json:{__type:'NotAuthorizedException',message:'Incorrect username or password.'}});
    if(target.endsWith('.ForgotPassword')){resets++;return route.fulfill({json:{CodeDeliveryDetails:{Destination:'q***@example.invalid',DeliveryMedium:'EMAIL',AttributeName:'email'}}});}
    if(target.endsWith('ConfirmForgotPassword')){
      confirmations++;
      if(route.request().postDataJSON().ConfirmationCode==='000000')return route.fulfill({status:400,json:{__type:'CodeMismatchException',message:'Invalid verification code provided.'}});
      return route.fulfill({json:{}});
    }
    return route.fulfill({json:{}});
  });
  await page.goto(base+'/login');
  await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign in with Cognito'})).toHaveCount(0);
  await page.getByLabel('Email address',{exact:true}).fill('qa@example.invalid');
  await page.getByLabel('Password',{exact:true}).fill('Wrong-example-password!42');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('p[role="alert"]')).toContainText('Email or password is incorrect');
  await expect(page.getByLabel('Email address',{exact:true})).toHaveValue('qa@example.invalid');
  await page.getByRole('button',{name:'Forgot password?'}).click();
  await page.getByRole('button',{name:'Send reset code'}).click();
  await expect(page.getByRole('heading',{name:'Check your email'})).toBeVisible();
  expect(resets).toBe(1);
  await page.getByLabel('Verification code',{exact:true}).fill('000000');
  await page.getByLabel('New password',{exact:true}).fill('New-example-password!42');
  await page.getByLabel('Confirm new password',{exact:true}).fill('Different-example!42');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Passwords do not match.');
  expect(confirmations).toBe(0);
  await page.getByLabel('Confirm new password',{exact:true}).fill('New-example-password!42');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page.locator('p[role="alert"]')).toContainText('Incorrect code');
  await page.getByRole('button',{name:'Request a new code'}).click();
  await expect.poll(()=>resets).toBe(2);
  await page.getByLabel('Verification code',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page.getByRole('status')).toHaveText('Password updated. Sign in with your new password.');
  expect(confirmations).toBe(2);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
  expect(new URL(page.url()).origin).toBe(new URL(base).origin);
  expect(documents.every(url=>new URL(url).origin===new URL(base).origin)).toBeTruthy();
});

test('direct logout clears local auth and stays on the current origin',async({page})=>{
  const documents:string[]=[];
  page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents.push(request.url());});
  await page.addInitScript(()=>{if(!sessionStorage.getItem('qa_seeded')){localStorage.setItem('auth_id_token','old-local-session');localStorage.setItem('current_user','{}');sessionStorage.setItem('qa_seeded','true');}});
  await page.goto(base+'/logout');
  await expect(page).toHaveURL(base+'/login');
  await expect(page.getByLabel('Email address',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('auth_id_token'))).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('current_user'))).toBeNull();
  expect(documents.every(url=>new URL(url).origin===new URL(base).origin)).toBeTruthy();
});

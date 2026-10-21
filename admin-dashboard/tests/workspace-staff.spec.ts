import { test, expect } from '@playwright/test';
const base=process.env.QA_ADMIN_URL||'http://localhost:3100',cid='00000000-0000-0000-0000-000000000001';
const self={username:'self',sub:'self-sub',email:'self@example.invalid',name:'Workspace Owner',status:'CONFIRMED',enabled:true,groups:['Admins']};
const target={username:'target',sub:'target-sub',email:'target@example.invalid',name:'Example Colleague',status:'CONFIRMED',enabled:true,groups:['Admins']};
async function seed(page:any){const payload=Buffer.from(JSON.stringify({token_use:'id',sub:'self-sub',email:self.email,'cognito:groups':['Admins'],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');await page.addInitScript((token:string)=>localStorage.setItem('auth_id_token',token),`test.${payload}.test`);}

test('real dashboard values link directly to video metrics',async({page})=>{
 await seed(page);
 await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**',async route=>{
  const url=new URL(route.request().url());let json:unknown=[];
  if(url.pathname==='/admin/learning/overview')json={courses:1,enrolled_learners:7,published_recordings:2,watched_seconds:180,students_started:3,completed_lectures:1,valid_certificates:1};
  if(url.pathname==='/courses')json=[{id:cid,title:'Example Course',status:'published'}];
  if(url.pathname==='/courses/'+cid)json={id:cid,title:'Example Course',status:'published'};
  if(url.pathname.endsWith('/completion-rules'))json={require_recorded:true};
  if(url.pathname.endsWith('/video-analytics'))json={videos:[],students:[],total_students:0,student_limit:500};
  await route.fulfill({json});
 });
 await page.goto(base+'/dashboard');
 await expect(page.getByRole('heading',{name:'Make every learning journey count.'})).toBeVisible();
 await expect(page.getByText('3.0 min',{exact:true})).toBeVisible();
 await expect(page.getByText('68%',{exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Video metrics',exact:true}).click();
 await expect(page.getByRole('region',{name:'Video viewing analytics'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Video metrics',exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});

test('staff roles and account deletion use separate guarded controls',async({page})=>{
 await seed(page);let admins=[self,target],marketing=[{...target,groups:['Marketing']}];const actions:any[]=[];
 await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**',async route=>{
  const url=new URL(route.request().url());let json:unknown=[];
  if(url.pathname==='/admin-users')json={users:admins};
  if(url.pathname==='/admin/marketing/users')json={users:marketing};
  if(url.pathname==='/admin/staff/actions'){
   const body=route.request().postDataJSON();actions.push(body);
   if(body.action==='remove_role'){marketing=[];json={message:'Marketing access removed. Other roles unchanged.'};}
   else{admins=admins.filter(u=>u.username!==body.username);json={message:'Sign-in account deleted. Historical records retained.'};}
  }
  await route.fulfill({json});
 });
 await page.goto(base+'/dashboard/admin-users');
 await expect(page.getByRole('heading',{name:'Staff directory'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Delete account '+self.email,exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Remove Admins from '+self.email,exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Remove Marketing from '+target.email,exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Only this role is removed');
 await page.getByRole('dialog').getByRole('button',{name:'Remove role',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Remove Marketing from '+target.email,exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Remove Admins from '+target.email,exact:true})).toBeVisible();
 expect(actions[0]).toEqual({username:'target',action:'remove_role',role:'Marketing',confirmation_email:target.email});
 await page.getByRole('button',{name:'Delete account '+target.email,exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Historical enrollments, invoices and learning records are retained.');
 const confirm=dialog.getByRole('button',{name:'Delete account',exact:true});await expect(confirm).toBeDisabled();
 await dialog.getByLabel('Type the account email to confirm').fill('wrong@example.invalid');await expect(confirm).toBeDisabled();
 expect(actions).toHaveLength(1);
 await dialog.getByLabel('Type the account email to confirm').fill(target.email);await confirm.click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Delete account '+target.email,exact:true})).toHaveCount(0);
 expect(actions[1]).toEqual({username:'target',action:'delete_account',confirmation_email:target.email});
 await page.getByRole('button',{name:'Invite administrator'}).click();
 await expect(page.getByLabel('Temporary password',{exact:true})).toHaveAttribute('type','password');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});

test('backend refusal stays visible and does not remove a staff row',async({page})=>{
 await seed(page);
 await page.route('https://*.execute-api.ap-south-1.amazonaws.com/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/admin/staff/actions')return route.fulfill({status:409,json:{error:'Keep at least one other enabled, confirmed administrator'}});
  await route.fulfill({json:path==='/admin-users'?{users:[self,target]}:path==='/admin/marketing/users'?{users:[]}:[]});
 });
 await page.goto(base+'/dashboard/admin-users');
 await page.getByRole('button',{name:'Remove Admins from '+target.email,exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Remove role',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Keep at least one other');
 await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.getByRole('button',{name:'Remove Admins from '+target.email,exact:true})).toBeVisible();
});

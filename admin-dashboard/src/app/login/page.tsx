'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, confirmSignIn, signOut, fetchAuthSession, resetPassword, confirmResetPassword, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { configureAuth } from '@/app/amplify-config';
import { authService } from '@/services/auth';
import { loginDestination } from '@/utils/login-destination';
import { getCurrentUserFromToken } from '@/utils/jwt';

type Stage = 'login' | 'new-password' | 'forgot' | 'reset' | 'mfa' | 'confirm';
const field = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-950 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50';
const titles: Record<Stage,string> = { login:'Welcome back', 'new-password':'Choose your password', forgot:'Reset your password', reset:'Check your email', mfa:'Verify your sign-in', confirm:'Confirm your email' };

function errorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (['NotAuthorizedException','UserNotFoundException'].includes(name)) return 'Email or password is incorrect. Please try again.';
  if (name === 'CodeMismatchException') return 'Incorrect code. Check your latest email or authenticator and try again.';
  if (name === 'ExpiredCodeException') return 'This code has expired. Request a new one and try again.';
  if (name === 'InvalidPasswordException') return 'Use at least 8 characters, including uppercase, lowercase, a number and a symbol.';
  if (['LimitExceededException','TooManyRequestsException','TooManyFailedAttemptsException'].includes(name)) return 'Too many attempts. Please wait a little before trying again.';
  if (name === 'NetworkError' || (error instanceof Error && /network|fetch/i.test(error.message))) return 'We could not connect. Check your connection and try again.';
  return 'We could not complete this step. Please try again or contact your AI4Impact administrator.';
}

function LoginForm() {
  const router=useRouter(), params=useSearchParams();
  const [stage,setStage]=useState<Stage>('login');
  const [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const [newPassword,setNewPassword]=useState(''), [repeat,setRepeat]=useState(''), [code,setCode]=useState('');
  const [show,setShow]=useState(false), [busy,setBusy]=useState(false);
  const [error,setError]=useState(''), [notice,setNotice]=useState('');
  useEffect(()=>{ configureAuth(); if(params?.get('error')==='access_denied')setError('Your account does not have access to this workspace. Contact your administrator.'); },[params]);

  async function finish() {
    const session=await fetchAuthSession(), token=session.tokens?.idToken?.toString();
    if(!token)throw new Error('Session unavailable');
    localStorage.setItem('auth_token',token);localStorage.setItem('auth_id_token',token);
    const user=getCurrentUserFromToken(token);
    if(user)localStorage.setItem('current_user',JSON.stringify(user));
    if(params?.get('portal')==='student'&&!sessionStorage.getItem('post_login_path'))sessionStorage.setItem('post_login_path','/student');
    router.replace(loginDestination());
  }
  async function advance(result: {isSignedIn:boolean;nextStep:{signInStep:string}}) {
    if(result.isSignedIn){await finish();return;}
    const next=result.nextStep.signInStep;
    if(next==='CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'){setStage('new-password');setPassword('');return;}
    if(['CONFIRM_SIGN_IN_WITH_TOTP_CODE','CONFIRM_SIGN_IN_WITH_SMS_CODE','CONFIRM_SIGN_IN_WITH_EMAIL_CODE'].includes(next)){setStage('mfa');setCode('');setNotice('Enter the code from your authenticator or the sign-in message.');return;}
    if(next==='CONFIRM_SIGN_UP'){setStage('confirm');setCode('');setNotice('Enter your email confirmation code, or request a new one below.');return;}
    if(next==='RESET_PASSWORD'){await requestReset();return;}
    setError('Your account needs additional security setup. Contact your AI4Impact administrator to continue.');
  }
  async function requestReset() {
    const result=await resetPassword({username:email.trim()});
    if(result.nextStep.resetPasswordStep==='CONFIRM_RESET_PASSWORD_WITH_CODE'){
      setStage('reset');setCode('');setNotice('If this account can receive password resets, use the code sent to its verified contact address.');
    }else{setStage('login');setNotice('Your reset is complete. Sign in with your password.');}
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;setError('');setNotice('');
    if(stage==='new-password'||stage==='reset'){
      if(newPassword!==repeat){setError('Passwords do not match.');return;}
      if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword)){setError('Use at least 8 characters, including uppercase, lowercase, a number and a symbol.');return;}
    }
    setBusy(true);
    try{
      if(stage==='login'){
        configureAuth();await signOut();authService.clearAuthStorage();
        await advance(await signIn({username:email.trim(),password}));
      }else if(stage==='new-password')await advance(await confirmSignIn({challengeResponse:newPassword}));
      else if(stage==='mfa')await advance(await confirmSignIn({challengeResponse:code.trim()}));
      else if(stage==='forgot')await requestReset();
      else if(stage==='reset'){
        await confirmResetPassword({username:email.trim(),confirmationCode:code.trim(),newPassword});
        setNewPassword('');setRepeat('');setPassword('');setStage('login');setNotice('Password updated. Sign in with your new password.');
      }else if(stage==='confirm'){
        await confirmSignUp({username:email.trim(),confirmationCode:code.trim()});
        setPassword('');setStage('login');setNotice('Email confirmed. You can now sign in.');
      }
    }catch(error){setError(errorMessage(error));}finally{setBusy(false);}
  }
  async function resend(){
    if(busy)return;setBusy(true);setError('');
    try{if(stage==='confirm'){await resendSignUpCode({username:email.trim()});setNotice('A new confirmation code was requested. Check your email.');}else await requestReset();}
    catch(error){setError(errorMessage(error));}finally{setBusy(false);}
  }
  function back(){setStage('login');setPassword('');setNewPassword('');setRepeat('');setCode('');setError('');setNotice('');}
  const choosing=stage==='new-password'||stage==='reset';
  const action:Record<Stage,string>={login:'Sign in','new-password':'Set password and sign in',forgot:'Send reset code',reset:'Update password',mfa:'Verify and sign in',confirm:'Confirm email'};
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
    <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 shadow-sm sm:p-10" aria-label="AI4Impact sign-in">
      <a href="https://www.ai4impact.in" className="text-xl font-bold tracking-tight text-primary-600">AI4Impact</a>
      <div className="mt-7 mb-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><LockKeyhole size={23}/></div><p className="text-xs font-semibold uppercase tracking-widest text-primary-600">{params?.get('portal')==='student'?'Student portal':'Staff console'}</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">{titles[stage]}</h1><p className="mt-2 text-sm leading-6 text-gray-500">{stage==='login'?'Sign in with your AI4Impact account to continue.':stage==='new-password'?'Use your own password to finish setting up your account.':stage==='forgot'?'Enter your account email to request a reset code.':`Continue for ${email}.`}</p></div>
      {error&&<p role="alert" className="mb-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice&&<p role="status" className="mb-5 rounded-lg bg-primary-50 p-3 text-sm text-primary-800">{notice}</p>}
      <form onSubmit={submit} className="space-y-5">
        {(stage==='login'||stage==='forgot')&&<label className="block text-sm font-medium text-gray-700">Email address<input autoFocus type="email" autoComplete="username" required maxLength={320} disabled={busy} className={field} value={email} onChange={event=>setEmail(event.target.value)}/></label>}
        {stage==='login'&&<label className="block text-sm font-medium text-gray-700">Password<input type={show?'text':'password'} autoComplete="current-password" required disabled={busy} className={field} value={password} onChange={event=>setPassword(event.target.value)}/></label>}
        {(stage==='reset'||stage==='mfa'||stage==='confirm')&&<label className="block text-sm font-medium text-gray-700">Verification code<input autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} className={field} value={code} onChange={event=>setCode(event.target.value)}/></label>}
        {choosing&&<><label className="block text-sm font-medium text-gray-700">New password<input type={show?'text':'password'} autoComplete="new-password" minLength={8} required disabled={busy} className={field} value={newPassword} onChange={event=>setNewPassword(event.target.value)}/></label><p className="text-xs leading-5 text-gray-500">At least 8 characters, with uppercase, lowercase, a number and a symbol.</p><label className="block text-sm font-medium text-gray-700">Confirm new password<input type={show?'text':'password'} autoComplete="new-password" minLength={8} required disabled={busy} className={field} value={repeat} onChange={event=>setRepeat(event.target.value)}/></label></>}
        {(stage==='login'||choosing)&&<div className="flex flex-wrap items-center justify-between gap-3 text-sm"><button type="button" disabled={busy} onClick={()=>setShow(!show)} aria-pressed={show} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800">{show?<EyeOff size={16}/>:<Eye size={16}/>} {show?'Hide passwords':'Show passwords'}</button>{stage==='login'&&<button type="button" disabled={busy} className="font-medium text-primary-700 hover:underline" onClick={()=>{setStage('forgot');setError('');setNotice('');setPassword('');}}>Forgot password?</button>}</div>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50">{busy&&<Loader2 size={18} className="animate-spin"/>}{busy?'Please wait…':action[stage]}</button>
      </form>
      {(stage==='reset'||stage==='confirm')&&<button type="button" disabled={busy} onClick={()=>void resend()} className="mt-5 text-sm font-medium text-primary-700 hover:underline">Request a new code</button>}
      {stage!=='login'&&<button type="button" disabled={busy} onClick={back} className="mt-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={15}/>Back to sign in</button>}
      <div className="mt-7 flex items-start gap-2 border-t pt-5 text-xs leading-5 text-gray-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary-600"/><p>Use the email associated with your account. Need access? Contact your AI4Impact administrator.</p></div>
    </section>
  </main>;
}

export default function LoginPage(){return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-primary-600" aria-label="Loading sign-in"/></main>}><LoginForm/></Suspense>;}

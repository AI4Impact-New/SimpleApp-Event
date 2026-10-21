'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Loader2 } from 'lucide-react';
import { configureAuth } from '@/app/amplify-config';
import 'aws-amplify/auth/enable-oauth-listener';
import {loginDestination} from '@/utils/login-destination';
import { getCurrentUserFromToken } from '@/utils/jwt';

configureAuth(true);

function getCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    // Read code from URL (window.location) so we don't depend on useSearchParams timing
    const code = getCodeFromUrl();
    if (!code) {
      const showNoCode = () =>
        setError('This sign-in link is incomplete or expired. Return to sign in and use your email and password.');
      const t = setTimeout(showNoCode, 300);
      return () => clearTimeout(t);
    }

    const storeTokenAndRedirect = async () => {
      if (done.current) return;
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        if (!idToken) {
          done.current = true;
          setError('Sign-in completed, but ID token is missing. Please sign in again.');
          return;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', idToken);
          localStorage.setItem('auth_id_token', idToken);
          const user = getCurrentUserFromToken(idToken);
          if (user) {
            localStorage.setItem('current_user', JSON.stringify(user));
          }
          done.current = true;
          router.replace(loginDestination());
        }
      } catch (_) {
        // Session not ready yet
      }
    };

    const hubListener = ({ payload }: { payload: { event: string } }) => {
      if (payload.event === 'signInWithRedirect' || payload.event === 'signedIn') {
        storeTokenAndRedirect();
      }
    };

    // Hub.listen returns an unsubscribe function in Amplify v6 (no Hub.remove)
    const unsubscribe = Hub.listen('auth', hubListener);

    // Also try once after a short delay (in case listener already ran)
    const t = setTimeout(() => storeTokenAndRedirect(), 1500);

    return () => {
      typeof unsubscribe === 'function' && unsubscribe();
      clearTimeout(t);
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full p-8 sm:p-10 bg-white rounded-xl shadow-sm border border-gray-200 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign-in issue</h1>
          <p className="text-red-600 text-sm mb-6">{error}</p>
          <a
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full p-8 sm:p-10 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center gap-4 text-center">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-gray-600">Completing sign-in…</p>
      </div>
    </div>
  );
}

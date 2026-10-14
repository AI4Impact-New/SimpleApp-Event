'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isIdToken, isAdminFromToken, decodeJwtPayload } from '@/utils/jwt';

/**
 * Client guard: allow dashboard only when a valid ID token is present.
 * Role authorization is enforced by backend APIs.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('auth_id_token') || localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    const expires = Number(decodeJwtPayload(token)?.exp || 0);
    if (!isIdToken(token) || expires * 1000 <= Date.now()) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_id_token');
      router.replace('/login');
      return;
    }
    setAllowed(isAdminFromToken(token));
  }, [router]);

  if (allowed === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <p className="text-sm">Checking access…</p>
        </div>
      </div>
    );
  }
  if (!allowed) return <div className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-semibold">Admin access required</h1><p className="mt-3 text-gray-600">Your account is signed in, but is not in the Admins group. Ask your administrator for access.</p><a className="mt-5 inline-block text-blue-700 underline" href="/login">Return to sign in</a></div>;
  return <>{children}</>;
}

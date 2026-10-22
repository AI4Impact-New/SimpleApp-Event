'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { decodeJwtPayload, isIdToken, isAdminFromToken, isMarketingFromToken } from '@/utils/jwt';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_id_token') || localStorage.getItem('auth_token');
    const expires = token ? Number(decodeJwtPayload(token)?.exp || 0) : 0;
    // Choose the destination before visiting a protected page. Backend APIs
    // independently validate the session and role on every request.
    const active = token && isIdToken(token) && expires * 1000 > Date.now();
    const destination = active && isAdminFromToken(token)
      ? '/dashboard'
      : active && isMarketingFromToken(token)
        ? '/dashboard/course-enquiries'
        : '/login';
    router.replace(destination);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50" aria-label="Opening staff console">
      <Loader2 size={28} className="animate-spin text-primary-500" aria-hidden="true" />
      <span className="sr-only" role="status">Opening your workspace…</span>
    </main>
  );
}

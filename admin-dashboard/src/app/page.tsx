'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isAdminFromToken, isMarketingFromToken } from '@/utils/jwt';
import { authService } from '@/services/auth';
import { browserSessionExpired, STAFF_IDLE_KEY, STAFF_IDLE_MS } from '../../../mobile-app/src/utils/browserIdle';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    if (authService.getToken() && browserSessionExpired(STAFF_IDLE_KEY, STAFF_IDLE_MS)) {
      void authService.logout();
      return;
    }
    void authService.getUsableToken().then(token => {
      if (!active) return;
      const destination = token && isAdminFromToken(token)
        ? '/dashboard'
        : token && isMarketingFromToken(token)
          ? '/dashboard/course-enquiries'
          : '/login';
      router.replace(destination);
    });
    return () => { active = false; };

  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50" aria-label="Opening staff console">
      <Loader2 size={28} className="animate-spin text-primary-500" aria-hidden="true" />
      <span className="sr-only" role="status">Opening your workspace…</span>
    </main>
  );
}

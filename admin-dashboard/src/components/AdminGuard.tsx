"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/services/auth";
import { StaffIdleSession } from "./StaffIdleSession";
import { browserSessionExpired, STAFF_IDLE_KEY, STAFF_IDLE_MS } from "../../../mobile-app/src/utils/browserIdle";
import {
  isIdToken,
  isAdminFromToken,
  isMarketingFromToken,
  decodeJwtPayload,
} from "@/utils/jwt";

/**
 * Client guard: allow dashboard only when a valid ID token is present.
 * Role authorization is enforced by backend APIs.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    async function authorize() {
      if (browserSessionExpired(STAFF_IDLE_KEY, STAFF_IDLE_MS) && authService.getToken()) {
        setAllowed(null);
        await authService.logout();
        return;
      }
      const current = authService.getToken();
      const expiresAt = Number(decodeJwtPayload(current || "")?.exp || 0) * 1000;
      const token = current && isIdToken(current) && expiresAt > Date.now()
        ? current
        : await authService.getUsableToken();
      if (!active) return;
      if (!token || !isIdToken(token)) {
        authService.clearAuthStorage();
        router.replace("/login");
        return;
      }
      const admin = isAdminFromToken(token);
      const marketing = isMarketingFromToken(token);
      if (path === "/dashboard/programme" && !admin) {
        try {
          const { programme } = await import("@/services/programme");
          const access = await programme.access();
          if (active) setAllowed(access.admin || access.courses.length > 0);
        } catch {
          if (active) setAllowed(false);
        }
        return;
      }
      if (!admin && marketing && path !== "/dashboard/course-enquiries") {
        setAllowed(null);
        router.replace("/dashboard/course-enquiries");
        return;
      }
      setAllowed(admin || (marketing && path === "/dashboard/course-enquiries"));
    }
    void authorize();
    return () => { active = false; };
  }, [router, path]);

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
  if (!allowed)
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">Staff access required</h1>
        <p className="mt-3 text-gray-600">
          Your account is signed in, but does not have an Admins or Marketing
          staff role. Ask your administrator for access.
        </p>
        <a className="mt-5 inline-block text-blue-700 underline" href="/login">
          Return to sign in
        </a>
      </div>
    );
  return <>{children}<StaffIdleSession /></>;
}

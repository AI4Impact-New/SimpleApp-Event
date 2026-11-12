"use client";

import { useEffect, useRef, useState } from "react";
import { authService } from "@/services/auth";
import { STAFF_IDLE_KEY, STAFF_IDLE_MS, startBrowserIdleSession } from "../../../mobile-app/src/utils/browserIdle";

export function StaffIdleSession() {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);
  const session = useRef<ReturnType<typeof startBrowserIdleSession> | null>(null);

  useEffect(() => {
    const controller = startBrowserIdleSession({
      key: STAFF_IDLE_KEY,
      timeout: STAFF_IDLE_MS,
      onWarning: setSeconds,
      onExpire: () => {
        setExpired(true);
        void authService.logout();
      },
    });
    session.current = controller;
    return () => controller.stop();
  }, []);

  const open = expired || seconds !== null;
  useEffect(() => {
    const dialog = modal.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={modal} onCancel={event => event.preventDefault()} aria-labelledby="staff-idle-title"
      className="w-[min(92vw,420px)] rounded-xl border bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/50">
      <h2 id="staff-idle-title" className="text-xl font-semibold">{expired ? "Signing out" : "Still working?"}</h2>
      {!expired && <>
        <p className="mt-2 text-sm text-slate-600">Your session will end in {seconds} seconds due to inactivity.</p>
        <button type="button" className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => session.current?.stay()}>Stay logged in</button>
      </>}
    </dialog>
  );
}

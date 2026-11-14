"use client";

import { useEffect } from "react";

export function VerifyRedirect() {
  useEffect(() => { window.location.replace(`/certification/${window.location.search}#verify`); }, []);
  return <p className="px-(--container-pad) py-(--space-20) text-center text-(length:--fs-sm) text-(--text-body)">
    Opening certificate verification… <a className="underline" href="/certification#verify">Continue</a>
  </p>;
}

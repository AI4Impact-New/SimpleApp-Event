// App-wide HTTP error policy (handover §10 status table)

/** Map an axios error to user-facing text, following the handover's HTTP status table. */
export function apiErrorMessage(err: any, fallback: string): string {
  const status = err?.response?.status;
  if (err && !err.response && (err.isAxiosError || err.request)) {
    return 'No connection. Check your internet and try again.';
  }
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return 'Service is temporarily unavailable. Please try again shortly.';
  }
  return err?.response?.data?.error ?? err?.response?.data?.message ?? fallback;
}

/** React Query retry policy: back off on 429/5xx/offline, never retry client errors. */
export function shouldRetry(failureCount: number, err: any): boolean {
  const status = err?.response?.status;
  if (status && status < 500 && status !== 429) return false;
  return failureCount < 2;
}

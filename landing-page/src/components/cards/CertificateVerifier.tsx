"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Search, ShieldCheck, ShieldX } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com";
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Certificate = { id: string; valid: boolean; recipient_name?: string; course_title?: string; provider?: string; issued_at?: string };

/**
 * Credential-ID check, embedded in the Professional certificate card on /certification.
 * Certificate QR codes open /verify?id=…, which redirects here with the id preserved.
 */
export function CertificateVerifier() {
  const [input, setInput] = useState("");
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);

  const verify = useCallback(async (raw: string) => {
    active.current?.abort();
    const id = raw.trim().toLowerCase();
    setCertificate(null);
    setError("");
    if (!ID.test(id)) {
      setLoading(false);
      setError("Enter the full credential ID printed on the certificate.");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    window.history.replaceState(null, "", `${window.location.pathname}?id=${encodeURIComponent(id)}#verify`);
    try {
      const response = await fetch(`${API.replace(/\/$/, "")}/certificates/${id}/verify`, { signal: controller.signal, cache: "no-store" });
      if (response.status === 404) throw new Error("Certificate not found. Check the ID and try again.");
      if (!response.ok) throw new Error("We could not verify this certificate right now. Please try again.");
      const data: Certificate = await response.json();
      if (typeof data.valid !== "boolean" || data.id !== id) throw new Error("We could not verify this certificate right now. Please try again.");
      if (active.current === controller) setCertificate(data);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      if (active.current === controller) setError(cause instanceof Error ? cause.message : "Unable to connect. Please try again.");
    } finally {
      if (active.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    // A QR-code link carries ?id=…; it is only readable in the browser, so check it after mount.
    if (id) queueMicrotask(() => {
      setInput(id);
      void verify(id);
      document.getElementById("verify")?.scrollIntoView({ block: "center" });
    });
    return () => active.current?.abort();
  }, [verify]);

  return (
    <div className="mt-(--space-5) rounded-(--radius-xl) bg-(--surface-alt) p-(--space-4)">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void verify(input);
        }}
      >
        <label htmlFor="certificate-id" className="block text-(length:--fs-xs) font-semibold text-(--text-strong)">
          Verify a certificate
        </label>
        <p id="certificate-help" className="mt-(--space-1) text-(length:--fs-2xs) leading-(--lh-body) text-(--text-muted)">
          Scan the QR code or enter the credential ID printed near the issue date. No sign-in required.
        </p>
        <div className="mt-(--space-3) flex flex-col gap-(--space-2) sm:flex-row">
          <input
            id="certificate-id"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. 061d082b-63d0-4fec-b871-c654aa24a40b"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="certificate-help"
            className="h-(--h-btn-md) w-full min-w-0 rounded-(--radius-btn) border border-(--border-default) bg-(--surface-card) px-(--space-3) font-mono text-(length:--fs-xs) text-(--text-strong) outline-none focus:border-(--border-accent) focus:ring-2 focus:ring-(--teal-100)"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-(--h-btn-md) shrink-0 items-center justify-center gap-(--space-2) rounded-(--radius-btn) bg-(--navy-800) px-(--space-4) text-(length:--fs-xs) font-semibold text-(--white) hover:bg-(--navy-700) disabled:opacity-60"
          >
            {loading ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <Search size={15} aria-hidden />}
            {loading ? "Checking…" : "Verify"}
          </button>
        </div>
      </form>

      <div aria-live="polite" aria-busy={loading}>
        {error && (
          <p role="alert" className="mt-(--space-3) rounded-(--radius-btn) border border-amber-200 bg-amber-50 p-(--space-3) text-(length:--fs-xs) leading-(--lh-body) text-amber-950">
            {error}
          </p>
        )}
        {certificate && (
          <article className="mt-(--space-3) rounded-(--radius-btn) border border-(--border-default) bg-(--surface-card) p-(--space-4)">
            {certificate.valid ? (
              <>
                <h4 className="flex items-center gap-(--space-2) text-(length:--fs-sm) font-semibold text-emerald-700">
                  <ShieldCheck size={18} aria-hidden /> Verified certificate
                </h4>
                <p className="mt-(--space-3) font-(family-name:--font-display) text-(length:--fs-body) font-bold text-(--text-strong)">
                  {certificate.recipient_name}
                </p>
                <p className="mt-(--space-1) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">Completed {certificate.course_title}</p>
                {certificate.course_title?.includes("DEMO ONLY") && (
                  <p className="mt-(--space-2) text-(length:--fs-2xs) font-medium text-amber-800">
                    Demonstration certificate only. This is not an educational qualification.
                  </p>
                )}
                <dl className="mt-(--space-3) space-y-(--space-1) text-(length:--fs-xs)">
                  <div className="flex justify-between gap-(--space-4)">
                    <dt className="text-(--text-muted)">Issued by</dt>
                    <dd className="text-right font-semibold text-(--text-strong)">{certificate.provider}</dd>
                  </div>
                  <div className="flex justify-between gap-(--space-4)">
                    <dt className="text-(--text-muted)">Issue date</dt>
                    <dd className="text-(--text-strong)">
                      {certificate.issued_at
                        ? new Date(certificate.issued_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
                        : "Unavailable"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-(--space-3) text-(length:--fs-2xs) leading-(--lh-body) text-(--text-muted)">
                  Compare the recipient and course shown here with the details on the certificate.
                </p>
              </>
            ) : (
              <>
                <h4 className="flex items-center gap-(--space-2) text-(length:--fs-sm) font-semibold text-red-700">
                  <ShieldX size={18} aria-hidden /> Certificate revoked
                </h4>
                <p className="mt-(--space-2) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
                  This certificate is no longer valid. Contact the issuing organization for details.
                </p>
              </>
            )}
            <p className="mt-(--space-3) break-all border-t border-(--border-default) pt-(--space-3) font-mono text-(length:--fs-2xs) text-(--text-muted)">
              {certificate.id}
            </p>
          </article>
        )}
      </div>
    </div>
  );
}

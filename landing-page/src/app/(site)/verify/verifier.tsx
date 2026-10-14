"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Award, ShieldCheck, ShieldX, Search, LoaderCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com";
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Certificate = { id: string; valid: boolean; recipient_name?: string; course_title?: string; provider?: string; issued_at?: string };

export function CertificateVerifier() {
  const [input, setInput] = useState("");
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  const verify = useCallback(async (raw: string) => {
    active.current?.abort();
    const id = raw.trim().toLowerCase();
    setCertificate(null); setError("");
    if (!ID.test(id)) { setLoading(false); setError("Enter the full certificate ID printed on your certificate."); return; }
    const controller = new AbortController(); active.current = controller; setLoading(true);
    window.history.replaceState(null, "", `/verify/?id=${encodeURIComponent(id)}`);
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
    } finally { if (active.current === controller) setLoading(false); }
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) { setInput(id); void verify(id); }
    return () => active.current?.abort();
  }, [verify]);

  return <section className="bg-slate-50 px-4 py-12 sm:py-20">
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">AI4Impact credentials</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Verify a certificate</h1>
      <p className="mt-4 text-base leading-7 text-slate-600">Scan the certificate QR code or enter its certificate ID to check the official issue record. No sign-in required.</p>
      <form className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" onSubmit={event => { event.preventDefault(); void verify(input); }}>
        <label htmlFor="certificate-id" className="block text-sm font-semibold text-slate-900">Certificate ID</label>
        <input id="certificate-id" value={input} onChange={event => setInput(event.target.value)} placeholder="e.g. 061d082b-63d0-4fec-b871-c654aa24a40b" autoComplete="off" spellCheck={false} aria-describedby="certificate-help" className="mt-2 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
        <p id="certificate-help" className="mt-2 text-sm text-slate-500">Find this ID near the issue date on your PDF.</p>
        <button type="submit" disabled={loading} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{loading ? <LoaderCircle size={18} className="animate-spin" /> : <Search size={18} />}{loading ? "Checking certificate…" : "Verify certificate"}</button>
      </form>
      <div aria-live="polite" aria-busy={loading} className="mt-6">
        {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h2 className="font-semibold">Unable to verify</h2><p className="mt-2 text-sm leading-6">{error}</p></div>}
        {certificate && <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 p-6 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-teal-300">AI4Impact</p><h2 className="mt-2 text-xl font-semibold">Certificate verification</h2></div>
          <div className="p-6 sm:p-8">{certificate.valid ? <>
            <div className="flex items-center gap-3 text-emerald-700"><ShieldCheck size={28} /><h3 className="font-semibold">Verified certificate</h3></div>
            <div className="mt-5 rounded-xl bg-slate-50 p-5"><Award size={28} className="text-blue-600" /><p className="mt-3 text-xl font-semibold text-slate-950">{certificate.recipient_name}</p><p className="mt-2 text-sm leading-6 text-slate-600">Completed {certificate.course_title}</p></div>
            {certificate.course_title?.includes("DEMO ONLY") && <p className="mt-4 text-sm font-medium text-amber-800">Demonstration certificate only. This is not an educational qualification.</p>}
            <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Issued by</dt><dd className="text-right font-semibold text-slate-950">{certificate.provider}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Issue date</dt><dd className="text-slate-950">{certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "Unavailable"}</dd></div></dl>
            <p className="mt-5 text-sm leading-6 text-slate-500">Compare the recipient and course shown here with the details on the certificate.</p>
          </> : <><div className="flex items-center gap-3 text-red-700"><ShieldX size={28} /><h3 className="font-semibold">Certificate revoked</h3></div><p className="mt-4 text-sm leading-6 text-slate-600">This certificate is no longer valid. Contact the issuing organization for details.</p></>}
            <p className="mt-5 break-all border-t border-slate-200 pt-4 font-mono text-xs text-slate-500">{certificate.id}</p>
          </div>
        </article>}
      </div>
    </div>
  </section>;
}

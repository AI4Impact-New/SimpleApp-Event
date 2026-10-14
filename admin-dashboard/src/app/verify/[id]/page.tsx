'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, ShieldX, Award } from 'lucide-react';

interface Verification { valid: boolean; id: string; recipient_name?: string; course_title?: string; provider?: string; issued_at?: string }
export default function VerifyCertificate() {
  const id = useParams()?.id as string; const [value, setValue] = useState<Verification | null>(null); const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/certificates/${encodeURIComponent(id)}/verify`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Certificate not found'); setValue(data);
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message); });
    return () => controller.abort();
  }, [id]);
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><section className="w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b bg-slate-950 p-7 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-blue-300">AI4Impact</p><h1 className="mt-3 text-2xl font-semibold">Certificate verification</h1></div><div className="space-y-5 p-7">{error ? <><ShieldX size={40} className="text-red-500" /><h2 className="text-lg font-semibold">Unable to verify</h2><p role="alert" className="text-sm text-gray-600">{error}</p></> : !value ? <p className="text-sm text-gray-500">Checking certificate…</p> : value.valid ? <><div className="flex items-center gap-3 text-emerald-700"><ShieldCheck size={30} /><h2 className="font-semibold">Verified certificate</h2></div><div className="rounded-xl bg-slate-50 p-5"><Award className="mb-3 text-blue-600" size={26} /><h3 className="text-xl font-semibold text-gray-950">{value.recipient_name}</h3><p className="mt-2 text-sm leading-6 text-gray-600">Completed {value.course_title}</p></div><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-gray-500">Issued by</dt><dd className="text-right font-medium">{value.provider}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Issue date</dt><dd>{value.issued_at ? new Date(value.issued_at).toLocaleDateString() : ''}</dd></div></dl><p className="break-all border-t pt-4 font-mono text-xs text-gray-400">{value.id}</p></> : <><ShieldX size={40} className="text-red-500" /><h2 className="text-lg font-semibold">Certificate revoked</h2><p className="text-sm text-gray-600">This certificate is no longer valid. Contact the issuing organization for details.</p></>}</div></section></main>;
}

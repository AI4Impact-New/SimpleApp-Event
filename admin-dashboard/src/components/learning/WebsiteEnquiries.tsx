"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Loader2 } from "lucide-react";
import api from "@/services/api";
import { AssistedEnrollment } from "./AssistedEnrollment";
import { errorMessage } from "@/services/learning";

type Lead = {
  kind: string;
  organisation?: string;
  hiring_roles?: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  consent: boolean;
  consent_at: string;
  consent_version: string;
  source_page: string;
  status: string;
  notes: string;
  created_at: string;
};
type Result = {
  enquiries: Lead[];
  total: number;
  offset: number;
  limit: number;
};
const statuses = ["new", "contacted", "registered", "dropped"];
function LeadRow({ lead }: { lead: Lead }) {
  const client = useQueryClient();
  const [onboarding, setOnboarding] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <p className="font-semibold">{lead.name}</p>
        <a
          className="mt-2 flex items-center gap-1.5 text-primary-700"
          href={`mailto:${encodeURIComponent(lead.email)}`}
        >
          <Mail size={14} />
          <span className="break-all">{lead.email}</span>
        </a>
        <a
          className="mt-2 flex items-center gap-1.5 text-primary-700"
          href={`tel:${lead.phone}`}
        >
          <Phone size={14} />
          {lead.phone}
        </a>
      </td>
      <td className="px-4 py-4">
        <p className="text-xs uppercase text-gray-500">
          {lead.kind === "employer" ? "Employer hiring" : "Career guidance"}
        </p>
        <p>{lead.interest}</p>
        {lead.organisation && (
          <p className="mt-2 font-semibold">{lead.organisation}</p>
        )}
        {lead.hiring_roles && (
          <p className="mt-2 whitespace-pre-wrap">{lead.hiring_roles}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">Source: {lead.source_page}</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-emerald-700">Contact consent recorded</p>
        <p className="mt-2 text-xs text-gray-500">
          {new Date(lead.consent_at).toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-gray-400">{lead.consent_version}</p>
      </td>
      <td className="min-w-64 px-4 py-4">
        <label className="block text-xs font-medium text-gray-600">
          Follow-up status
          <select
            aria-label={`Status for ${lead.name}`}
            className="mt-1 w-full rounded-lg border p-2 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setSaved(false);
            }}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs font-medium text-gray-600">
          Marketing notes
          <textarea
            aria-label={`Notes for ${lead.name}`}
            maxLength={2000}
            rows={2}
            className="mt-1 w-full rounded-lg border p-2 text-sm"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <button
          disabled={busy}
          className="mt-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api.learningRequest(
                "PATCH",
                `/admin/enquiries/${lead.id}`,
                { status, notes },
              );
              setSaved(true);
              await client.invalidateQueries({
                queryKey: ["website-enquiries"],
              });
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save follow-up"}
        </button>
        {saved && (
          <p role="status" className="mt-2 text-xs text-emerald-700">
            Follow-up saved
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </td>
      <td className="min-w-48 px-4 py-4">
        {lead.kind === "guidance" ? <><p className="text-xs text-gray-500">Profile, account and personal quote</p><button onClick={() => setOnboarding(true)} className="mt-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100">Open student workspace</button>{onboarding && <AssistedEnrollment leadId={lead.id} onClose={() => setOnboarding(false)} />}</> : <p className="text-xs text-gray-400">Employer hiring enquiry</p>}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500">
        {new Date(lead.created_at).toLocaleString()}
      </td>
    </tr>
  );
}
export function WebsiteEnquiries() {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["website-enquiries", kind, status, search, offset],
    queryFn: () =>
      api.learningRequest<Result>(
        "GET",
        `/admin/enquiries?kind=${encodeURIComponent(kind)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}&offset=${offset}`,
      ),
  });
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Career-guidance and employer hiring requests. Marketing can contact
        these leads, record follow-up, and open the student workspace to prepare
        an authorized account and personal quote. Status labels alone do not grant course access.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Type
          <select
            aria-label="Filter enquiry type"
            className="ml-2 rounded-lg border p-2"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All types</option>
            <option value="guidance">Career guidance</option>
            <option value="employer">Employer hiring</option>
          </select>
        </label>
        <label className="text-sm">
          Status
          <select
            aria-label="Filter website enquiries"
            className="ml-2 rounded-lg border p-2"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <input
          aria-label="Search website enquiries"
          placeholder="Search name, email, phone or interest"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
      </div>
      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage(error)}
        </p>
      ) : !data?.enquiries.length ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <h2 className="font-semibold">No website enquiries yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Saved guidance and employer hiring requests appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full divide-y text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    "Contact",
                    "Interest",
                    "Consent",
                    "Follow-up",
                    "Student onboarding",
                    "Submitted",
                  ].map((t) => (
                    <th key={t} className="px-4 py-3">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.enquiries.map((l) => (
                  <LeadRow key={l.id} lead={l} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{data.total} enquiries</span>
            <div className="flex gap-3">
              <button
                disabled={!offset}
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Previous
              </button>
              <button
                disabled={offset + 50 >= data.total}
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
                onClick={() => setOffset(offset + 50)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

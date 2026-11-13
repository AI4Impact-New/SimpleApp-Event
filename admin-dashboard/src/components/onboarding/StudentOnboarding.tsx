"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileClock,
  FileText,
  Loader,
  Loader2,
  Mail,
  Plus,
  Search,
  Split,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import api from "@/services/api";
import { Select } from "@/components/ui/Select";
import { errorMessage } from "@/services/learning";
import { feeLedger, FeeAccount, LedgerReport } from "@/services/feeLedger";

/* ---------- Types (existing API contracts) ---------- */

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: string;
  created_at: string;
};
type Quote = {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
  buyer_email: string;
  buyer_name: string;
  marked_price_paise: number;
  discount_bps: number;
  total_paise: number;
  checkout_url: string;
  expires_at: string;
  status: string;
  created_at: string;
};
type Workspace = {
  lead: { name: string; email: string; phone: string };
  enrollment: null | {
    user_id: string | null;
    profile: Record<string, string>;
    account_created_here: boolean;
  };
  quotes: Quote[];
  actions: { action: string; state: string; created_at: string }[];
  quote_email_enabled: boolean;
};
type Course = {
  id: string;
  title: string;
  marked_price_paise: number;
  discount_percentage: number;
};

/* ---------- Helpers ---------- */

const STEPS = [
  "Student details",
  "Account invitation",
  "Personal quote",
  "Instalment plan",
] as const;
const PROFILE: Record<string, string> = {
  name: "",
  email: "",
  phone: "",
  user_type: "student",
  university: "",
  course: "",
  year_of_study: "",
  city: "",
  state: "",
  designation: "",
  company: "",
};
const LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email address",
  phone: "Phone / WhatsApp",
  university: "University",
  course: "Degree / course of study",
  year_of_study: "Year of study",
  city: "City",
  state: "State",
  designation: "Designation",
  company: "Company / college",
};
// Responses carry consent and audit metadata; only the profile contract is sent back.
const studentProfile = (source: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(PROFILE).map(([k, fallback]) => [
      k,
      typeof source[k] === "string" ? (source[k] as string) : fallback,
    ]),
  ) as Record<string, string>;
const input =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-slate-500";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const card = "rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    paise / 100,
  );
const when = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return `${date} at ${time}`;
};
const indiaToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const paise = (raw: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(raw))
    throw Error("Enter an INR amount with at most two decimals.");
  return Math.round(Number(raw) * 100);
};
const batchKey = (leadId: string) => `onboarding-batch:${leadId}`;
const storedBatch = (leadId: string) => {
  try {
    return localStorage.getItem(batchKey(leadId)) || "";
  } catch {
    return "";
  }
};
const rememberBatch = (leadId: string, batchId: string) => {
  try {
    localStorage.setItem(batchKey(leadId), batchId);
  } catch {
    /* per-viewer convenience only */
  }
};

type Progress = {
  done: boolean[];
  current: number; // index of the first unfinished step, -1 when onboarded
  plan?: FeeAccount;
};
function progressOf(w: Workspace | undefined, accounts: FeeAccount[]): Progress {
  const uid = w?.enrollment?.user_id;
  const courses = new Set(w?.quotes.map((q) => q.course_id));
  const plan = uid
    ? accounts.find((a) => a.user_id === uid && courses.has(a.course_id))
    : undefined;
  const done = [
    !!w?.enrollment,
    !!uid,
    !!w?.quotes.length,
    !!plan,
  ];
  return { done, current: done.findIndex((d) => !d), plan };
}

/* ---------- Page ---------- */

type Filter = "progress" | "plan" | "complete" | "all";

export function StudentOnboarding() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("progress");
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);

  const leadsQuery = useQuery({
    queryKey: ["onboarding", "leads"],
    queryFn: async () => {
      const all: Lead[] = [];
      for (let offset = 0; offset < 500; offset += 50) {
        const page = await api.learningRequest<{
          enquiries: Lead[];
          total: number;
        }>("GET", `/admin/enquiries?kind=guidance&offset=${offset}`);
        all.push(...page.enquiries);
        if (all.length >= page.total || !page.enquiries.length) break;
      }
      return all;
    },
  });
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);

  const ledgerQuery = useQuery({
    queryKey: ["onboarding", "ledger"],
    queryFn: () =>
      feeLedger.report(new URLSearchParams({ as_of: indiaToday() })),
    retry: false,
  });
  const accounts = useMemo(
    () => ledgerQuery.data?.accounts ?? [],
    [ledgerQuery.data],
  );

  const workspaces = useQueries({
    queries: leads.map((lead) => ({
      queryKey: ["assisted", lead.id],
      queryFn: () =>
        api.learningRequest<Workspace>(
          "GET",
          `/admin/enquiries/${lead.id}/assisted`,
        ),
      staleTime: 60_000,
    })),
  });

  const rows = useMemo(
    () =>
      leads.map((lead, i) => {
        const w = workspaces[i]?.data;
        return {
          lead,
          workspace: w,
          loading: workspaces[i]?.isLoading ?? true,
          progress: progressOf(w, accounts),
        };
      }),
    [leads, workspaces, accounts],
  );

  const isProgress = (r: (typeof rows)[number]) =>
    r.progress.current !== -1 && r.lead.status !== "dropped";
  const counts = {
    progress: rows.filter(isProgress).length,
    plan: rows.filter((r) => r.progress.current === 3).length,
    complete: rows.filter((r) => r.progress.current === -1).length,
    all: rows.length,
  };
  const quotesAwaiting = rows.filter(
    (r) =>
      !r.progress.plan && r.workspace?.quotes.some((q) => q.status === "pending"),
  ).length;

  const term = search.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter === "progress" && !isProgress(r)) return false;
    if (filter === "plan" && r.progress.current !== 3) return false;
    if (filter === "complete" && r.progress.current !== -1) return false;
    if (!term) return true;
    const haystack = [
      r.lead.name,
      r.lead.email,
      r.lead.phone,
      r.progress.plan?.batch_code,
      ...(r.workspace?.quotes.map((q) => q.course_title) ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });

  useEffect(() => {
    if (!visible.length) return;
    if (!visible.some((r) => r.lead.id === selected)) setSelected(visible[0].lead.id);
  }, [visible, selected]);

  const active = rows.find((r) => r.lead.id === selected);

  const stats = [
    { label: "In progress", value: counts.progress, icon: Loader },
    { label: "Awaiting instalment plan", value: counts.plan, icon: Split },
    { label: "Quotes awaiting acceptance", value: quotesAwaiting, icon: FileClock },
    { label: "Onboarded", value: counts.complete, icon: UserCheck },
  ];
  const filters: { key: Filter; label: string }[] = [
    { key: "progress", label: "In progress" },
    { key: "plan", label: "Plan pending" },
    { key: "complete", label: "Complete" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student onboarding
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Capture student details, send account invitations, issue personal
            quotes and agree instalment plans before payments begin.
          </p>
        </div>
        <button className={primary + " shrink-0"} onClick={() => setCreating(true)}>
          <UserPlus size={18} aria-hidden="true" />
          New onboarding
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-500">{label}</p>
              <Icon size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {leadsQuery.isLoading ? "–" : value}
            </p>
          </div>
        ))}
      </div>

      {leadsQuery.error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage(leadsQuery.error)}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:sticky lg:top-24">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <label className="relative block">
              <span className="sr-only">Search onboarding</span>
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, email, batch"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Onboarding filter">
              {filters.map((f) => (
                <button
                  key={f.key}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${filter === f.key ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  {f.label} <span className="text-slate-400">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>
          {leadsQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary-500" size={24} />
            </div>
          ) : !visible.length ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No students match this view.
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
              {visible.map((r) => (
                <li key={r.lead.id}>
                  <StudentRow
                    row={r}
                    active={r.lead.id === selected}
                    onSelect={() => setSelected(r.lead.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        {active ? (
          <OnboardingDetail
            key={active.lead.id}
            lead={active.lead}
            workspace={active.workspace}
            loading={active.loading}
            progress={active.progress}
            ledger={ledgerQuery.data}
            ledgerError={ledgerQuery.error}
            refresh={async () => {
              await Promise.all([
                client.invalidateQueries({ queryKey: ["assisted", active.lead.id] }),
                client.invalidateQueries({ queryKey: ["onboarding", "ledger"] }),
                client.invalidateQueries({ queryKey: ["website-enquiries"] }),
              ]);
            }}
          />
        ) : (
          !leadsQuery.isLoading && (
            <section className={card + " text-center text-sm text-slate-500"}>
              Select a student, or start a new onboarding.
            </section>
          )
        )}
      </div>

      {creating && (
        <NewOnboarding
          close={() => setCreating(false)}
          created={async (id) => {
            setCreating(false);
            setFilter("progress");
            setSearch("");
            await client.invalidateQueries({ queryKey: ["onboarding", "leads"] });
            setSelected(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- List row ---------- */

function StageBadge({ current }: { current: number }) {
  const label = current === -1 ? "Onboarded" : STEPS[current];
  const tone =
    current === -1
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : current === 3
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-primary-200 bg-primary-50 text-primary-700";
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

function StudentRow({
  row,
  active,
  onSelect,
}: {
  row: { lead: Lead; workspace?: Workspace; loading: boolean; progress: Progress };
  active: boolean;
  onSelect: () => void;
}) {
  const { lead, workspace, loading, progress } = row;
  const quote = workspace?.quotes[0];
  const subtitle = progress.plan
    ? [progress.plan.course_title, progress.plan.batch_code].filter(Boolean).join(" · ")
    : quote
      ? `${quote.course_title} · ${money(quote.total_paise)}`
      : "No quote yet";
  return (
    <button
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={`block w-full px-4 py-4 text-left transition ${active ? "bg-primary-50/70" : "hover:bg-slate-50"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-medium text-slate-900">{lead.name}</p>
        {loading ? (
          <span className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
        ) : (
          <StageBadge current={progress.current} />
        )}
      </div>
      <p className="mt-1 truncate text-sm text-slate-500">{loading ? lead.email : subtitle}</p>
      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {progress.done.map((d, i) => (
          <span key={i} className={`h-1 rounded-full ${d ? "bg-emerald-500" : "bg-slate-200"}`} />
        ))}
      </div>
    </button>
  );
}

/* ---------- Detail panel ---------- */

function OnboardingDetail({
  lead,
  workspace,
  loading,
  progress,
  ledger,
  ledgerError,
  refresh,
}: {
  lead: Lead;
  workspace?: Workspace;
  loading: boolean;
  progress: Progress;
  ledger?: LedgerReport;
  ledgerError: unknown;
  refresh: () => Promise<void>;
}) {
  const [step, setStep] = useState(progress.current === -1 ? 3 : progress.current);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const ids = useRef<Record<string, string>>({});
  const opened = useRef(!!workspace);
  // Open on the student's current step once their workspace first loads.
  useEffect(() => {
    if (workspace && !opened.current) {
      opened.current = true;
      setStep(progress.current === -1 ? 3 : progress.current);
    }
  }, [workspace, progress.current]);
  const requestId = (key: string) => ids.current[key] ?? (ids.current[key] = crypto.randomUUID());
  const forget = (key: string) => delete ids.current[key];
  const base = `/admin/enquiries/${lead.id}/assisted`;

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(key);
    setProblem("");
    setMessage("");
    try {
      await action();
      forget(key);
      setMessage(success);
    } catch (e) {
      setProblem(errorMessage(e));
    } finally {
      await refresh();
      setBusy("");
    }
  }
  const ctx = { workspace, lead, base, busy, run, requestId, forget, setProblem, setMessage };

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
          Assisted enrolment
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{lead.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Collect details, invite the learner, prepare their personal quote and
          agree how they will pay.
        </p>
      </header>

      <div className="space-y-6 p-4 sm:p-6">
        <div role="tablist" aria-label="Onboarding steps" className="grid grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3">
          {STEPS.map((label, i) => (
            <button
              key={label}
              role="tab"
              aria-selected={step === i}
              onClick={() => setStep(i)}
              className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-lg border px-3 py-3 text-left text-sm font-medium transition 2xl:px-4 ${step === i ? "border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-600" : "border-slate-200 text-slate-800 hover:bg-slate-50"}`}
            >
              <span>
                {i + 1}. {label}
              </span>
              {progress.done[i] && (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" aria-label="Complete" />
              )}
            </button>
          ))}
        </div>

        {message && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {problem && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {problem}
          </p>
        )}

        {loading || !workspace ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-500" size={24} />
          </div>
        ) : (
          <div role="tabpanel">
            {step === 0 && <DetailsStep {...ctx} workspace={workspace} />}
            {step === 1 && <AccountStep {...ctx} workspace={workspace} />}
            {step === 2 && <QuoteStep {...ctx} workspace={workspace} ledger={ledger} />}
            {step === 3 && (
              <PlanStep
                {...ctx}
                workspace={workspace}
                plan={progress.plan}
                ledger={ledger}
                ledgerError={ledgerError}
                goToQuote={() => setStep(2)}
              />
            )}
          </div>
        )}

        <aside className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900 sm:p-5">
          <strong>Course access remains separate.</strong> Saving a quote or
          plan never grants enrolment. Access unlocks once the first instalment
          is verified as paid in the payments ledger.
        </aside>

        <section className={card}>
          <h3 className="font-semibold text-slate-900">Activity and delivery status</h3>
          {workspace?.actions.length ? (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {workspace.actions.map((a, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="text-slate-800">
                    {a.action.replaceAll("_", " ")}{" "}
                    <span className={a.state === "failed" ? "text-red-700" : "text-primary-700"}>
                      ({a.state})
                    </span>
                  </span>
                  <time className="text-xs text-slate-500" dateTime={a.created_at}>
                    {when(a.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No activity recorded yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

type StepProps = {
  workspace: Workspace;
  lead: Lead;
  base: string;
  busy: string;
  run: (key: string, action: () => Promise<unknown>, success: string) => Promise<void>;
  requestId: (key: string) => string;
  forget: (key: string) => void;
  setProblem: (v: string) => void;
  setMessage: (v: string) => void;
};

function StepHeading({ icon: Icon, title, text }: { icon?: typeof FileText; title: string; text: string }) {
  return (
    <>
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        {Icon && <Icon size={20} className="text-primary-600" aria-hidden="true" />}
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </>
  );
}

/* Step 1 */
function DetailsStep({ workspace, base, busy, run }: StepProps) {
  const [profile, setProfile] = useState(() =>
    studentProfile(workspace.enrollment?.profile || workspace.lead),
  );
  const [authorized, setAuthorized] = useState(!!workspace.enrollment);
  const [dirty, setDirty] = useState(false);
  const linked = !!workspace.enrollment?.user_id;
  const fields = [
    "name",
    "email",
    "phone",
    "city",
    "state",
    ...(profile.user_type === "student"
      ? ["university", "course", "year_of_study"]
      : ["designation", "company"]),
  ];
  function save(e: FormEvent) {
    e.preventDefault();
    void run(
      "profile",
      async () => {
        await api.learningRequest("PUT", base, {
          ...studentProfile(profile),
          account_authorized: authorized,
        });
        setDirty(false);
      },
      "Student details saved. Course access remains unchanged.",
    );
  }
  return (
    <form onSubmit={save} onChange={() => setDirty(true)} className={card}>
      <StepHeading
        title="Student details"
        text="Record details provided during the call. Students accept their own app privacy policy."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Profile type
          <Select
            className={input}
            value={profile.user_type}
            onChange={(e) => {
              setProfile({ ...profile, user_type: e.target.value });
              setDirty(true);
            }}
          >
            <option value="student">Student</option>
            <option value="professional">Working professional</option>
          </Select>
        </label>
        {fields.map((k) => (
          <label key={k} className="text-sm font-medium text-slate-700">
            {LABELS[k]}
            <input
              className={input}
              type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
              required={!["city", "state"].includes(k) || profile.user_type === "student"}
              maxLength={k === "email" ? 254 : 120}
              value={profile[k] || ""}
              disabled={linked && k === "email"}
              onChange={(e) => setProfile({ ...profile, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          required
          checked={authorized}
          onChange={(e) => setAuthorized(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primary-600"
        />
        The student authorised account creation, confirmed these details and
        agreed to receive account and course-quote emails.
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button disabled={!!busy} className={primary}>
          {busy === "profile" ? "Saving…" : "Save student details"}
        </button>
        {workspace.enrollment && !dirty && busy !== "profile" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <Check size={16} aria-hidden="true" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}

/* Step 2 */
function AccountStep({ workspace, base, busy, run, requestId }: StepProps) {
  const linked = !!workspace.enrollment?.user_id;
  const invitations = workspace.actions.filter((a) => a.action === "invitation");
  const latest = invitations[0];
  return (
    <section className={card}>
      <StepHeading
        icon={UserPlus}
        title="Account and welcome email"
        text={
          linked
            ? "Account linked. Existing accounts keep their passwords and profile. No course access is granted here."
            : workspace.enrollment
              ? "A new learner receives a temporary password and chooses their own on first sign-in. Existing accounts are linked without changing their password."
              : "Save the complete student details first."
        }
      />
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className={primary}
          disabled={!!busy || linked || !workspace.enrollment}
          onClick={() =>
            void run(
              "account",
              async () => {
                const r = await api.learningRequest<{ invitation_required: boolean }>(
                  "POST",
                  base + "/account",
                  {},
                );
                if (r.invitation_required)
                  await api.learningRequest("POST", base + "/invitation", {
                    request_id: requestId("account"),
                  });
              },
              "Account linked. New accounts receive a welcome invitation; existing passwords remain unchanged.",
            )
          }
        >
          {linked ? "Account linked" : busy === "account" ? "Creating…" : "Create or link student account"}
        </button>
        {linked && workspace.enrollment?.account_created_here && (
          <button
            className={secondary}
            disabled={!!busy}
            onClick={() => {
              if (
                window.confirm(
                  "Send a fresh invitation? This replaces an unused temporary password. Activated passwords stay unchanged.",
                )
              )
                void run(
                  "invite",
                  () =>
                    api.learningRequest("POST", base + "/invitation", {
                      request_id: requestId("invite"),
                    }),
                  "The welcome invitation was accepted for delivery.",
                );
            }}
          >
            <Mail size={18} aria-hidden="true" />
            Send / resend invitation
          </button>
        )}
      </div>
      {latest && (
        <p className="mt-4 text-sm text-slate-500">
          {invitations.length} invitation{invitations.length === 1 ? "" : "s"} sent · last{" "}
          {when(latest.created_at)}
        </p>
      )}
    </section>
  );
}

/* Step 3 */
function QuoteStep({
  workspace,
  lead,
  base,
  busy,
  run,
  requestId,
  forget,
  setProblem,
  setMessage,
  ledger,
}: StepProps & { ledger?: LedgerReport }) {
  const { data: courses = [] } = useQuery({
    queryKey: ["billing", "catalog"],
    queryFn: () => api.learningRequest<Course[]>("GET", "/billing/catalog"),
  });
  const batches = ledger?.batches ?? [];
  const useBatches = batches.length > 0;
  const [batchId, setBatchId] = useState(() => storedBatch(lead.id));
  const [courseId, setCourseId] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const linked = !!workspace.enrollment?.user_id;
  const batch = batches.find((b) => b.id === batchId);
  const selectedCourse = useBatches ? batch?.course_id || "" : courseId;

  const applyCourse = (id: string) => {
    const c = courses.find((x) => x.id === id);
    setPrice(c ? String(c.marked_price_paise / 100) : "");
    setDiscount(c ? String(c.discount_percentage) : "0");
    forget("quote");
  };
  // Prefill price once the catalogue loads for a remembered batch.
  useEffect(() => {
    if (selectedCourse && !price) applyCourse(selectedCourse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, courses.length]);

  const marked = /^\d+(\.\d{1,2})?$/.test(price) ? Math.round(Number(price) * 100) : 0;
  const pct = Math.min(Math.max(Number(discount) || 0, 0), 100);
  const discountPaise = Math.round((marked * pct) / 100);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCourse) return setProblem("Choose a batch or course.");
    if (!/^\d+(\.\d{1,2})?$/.test(price)) return setProblem("Enter a price with at most two decimals.");
    if (useBatches) rememberBatch(lead.id, batchId);
    void run(
      "quote",
      () =>
        api.learningRequest("POST", base + "/quotes", {
          request_id: requestId("quote"),
          course_id: selectedCourse,
          marked_price_paise: marked,
          discount_percentage: discount,
        }),
      "Personal quote saved. It does not grant course access.",
    );
  }

  async function download(q: Quote) {
    await run(
      "pdf",
      async () => {
        const token = localStorage.getItem("auth_id_token") || localStorage.getItem("auth_token");
        const root = (process.env.NEXT_PUBLIC_API_URL || "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com").replace(/\/$/, "");
        const r = await fetch(root + base + `/quotes/${q.id}/invoice`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("Could not download the PDF. Refresh your session and retry.");
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = `AI4Impact-pro-forma-${q.id}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      "Pro forma PDF downloaded.",
    );
  }
  function draft(q: Quote) {
    const body = `Hello ${q.buyer_name},\n\nYour personal quote for ${q.course_title}:\nMarked price: ${money(q.marked_price_paise)}\nDiscount: ${q.discount_bps / 100}%\nTotal: ${money(q.total_paise)}\n\nCheckout: ${q.checkout_url}\n\nThe PDF is pro forma, not a tax invoice.\n\nThe AI4Impact team`;
    window.location.href = `mailto:${encodeURIComponent(q.buyer_email)}?subject=${encodeURIComponent("AI4Impact | Your course quote")}&body=${encodeURIComponent(body)}`;
    setMessage("Email draft opened. Attach the downloaded PDF before sending. This does not record delivery.");
  }

  return (
    <section className={card}>
      <StepHeading
        icon={FileText}
        title="Personal course quote"
        text="This quote applies to this student only. Public prices on Course Fee & Structure stay unchanged."
      />
      {!linked && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Link the student account in step 2 before creating a quote.
        </p>
      )}
      <form onSubmit={submit} className="mt-5 grid items-end gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
        {useBatches ? (
          <label className="text-sm font-medium text-slate-700">
            Batch (course · trainer · start)
            <Select
              aria-label="Batch"
              required
              className={input}
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value);
                const b = batches.find((x) => x.id === e.target.value);
                applyCourse(b?.course_id || "");
              }}
            >
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {[b.code, b.trainer_name, b.starts_on && `starts ${new Date(b.starts_on).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </Select>
          </label>
        ) : (
          <label className="text-sm font-medium text-slate-700">
            Course
            <Select
              aria-label="Course"
              required
              className={input}
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                applyCourse(e.target.value);
              }}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </label>
        )}
        <label className="text-sm font-medium text-slate-700">
          Marked price (INR)
          <input
            className={input}
            required
            type="number"
            min="0"
            max="10000000"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              forget("quote");
            }}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Discount (%)
          <input
            className={input}
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={discount}
            onChange={(e) => {
              setDiscount(e.target.value);
              forget("quote");
            }}
          />
        </label>
        <button className={primary} disabled={!!busy || !linked}>
          {busy === "quote" ? "Creating…" : "Create quote"}
        </button>
      </form>
      <p className="mt-3 text-sm text-slate-600">
        Current discount: {money(discountPaise)} · Total:{" "}
        <strong className="text-slate-900">{money(marked - discountPaise)}</strong>
      </p>

      {workspace.quotes.length > 0 && !workspace.quote_email_enabled && (
        <p className="mt-5 rounded-lg bg-primary-50 p-3 text-sm text-primary-900">
          Automatic quote email awaits sender setup. Download the PDF, open the
          email draft and attach the PDF manually.
        </p>
      )}
      <div className="mt-5 space-y-3">
        {workspace.quotes.map((q) => (
          <article key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-semibold text-slate-900">{q.course_title}</h4>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="capitalize">{q.status}</span> · expires {when(q.expires_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-700">{money(q.total_paise)}</p>
                <p className="text-xs text-slate-500">
                  {money(q.marked_price_paise)} less {q.discount_bps / 100}%
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={secondary + " !py-2"} disabled={!!busy} onClick={() => void download(q)}>
                Download PDF
              </button>
              <button
                className={secondary + " !py-2"}
                disabled={!!busy}
                onClick={() => void run("copy", () => navigator.clipboard.writeText(q.checkout_url), "Checkout link copied.")}
              >
                Copy link
              </button>
              <button className={secondary + " !py-2"} onClick={() => draft(q)}>
                Open email draft
              </button>
              <button
                className={primary + " !py-2"}
                disabled={!!busy || !workspace.quote_email_enabled || q.status !== "pending"}
                onClick={() => {
                  if (window.confirm(`Email the quote and PDF to ${q.buyer_email}?`))
                    void run(
                      "email-" + q.id,
                      () =>
                        api.learningRequest("POST", base + `/quotes/${q.id}/email`, {
                          request_id: requestId("email-" + q.id),
                        }),
                      "The quote email was accepted for delivery. Inbox delivery is not guaranteed.",
                    );
                }}
              >
                Send quote email
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* Step 4 */
function PlanStep({
  workspace,
  lead,
  busy,
  run,
  requestId,
  forget,
  setProblem,
  plan,
  ledger,
  ledgerError,
  goToQuote,
}: StepProps & {
  plan?: FeeAccount;
  ledger?: LedgerReport;
  ledgerError: unknown;
  goToQuote: () => void;
}) {
  const quotes = workspace.quotes;
  const [quoteId, setQuoteId] = useState(quotes[0]?.id ?? "");
  const quote = quotes.find((q) => q.id === quoteId) ?? quotes[0];
  const batches = (ledger?.batches ?? []).filter((b) => b.course_id === quote?.course_id);
  const [batchId, setBatchId] = useState(() => storedBatch(lead.id));
  const [billedOn, setBilledOn] = useState(indiaToday);
  const [rows, setRows] = useState<{ amount: string; date: string }[]>(() =>
    quote ? [{ amount: String(quote.total_paise / 100), date: indiaToday() }] : [],
  );

  if (!quotes.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
        <Split size={28} className="mx-auto text-slate-400" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Create a personal quote first</h3>
        <p className="mt-1 text-sm text-slate-500">
          The instalment plan splits the quoted fee, so it needs a batch and a price.
        </p>
        <button className={primary + " mt-5"} onClick={goToQuote}>
          Go to personal quote
        </button>
      </div>
    );

  if (plan)
    return (
      <section className={card}>
        <StepHeading
          icon={Split}
          title="Agreed instalment plan"
          text={`${plan.course_title}${plan.batch_code ? " · " + plan.batch_code : ""} · ${money(plan.total_paise)} total · ${money(plan.paid_paise)} collected`}
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Instalment</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.installments.map((l) => (
                <tr key={l.number}>
                  <td className="py-2.5 pr-3">#{l.number}</td>
                  <td className="py-2.5 pr-3">{new Date(l.due_on).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="py-2.5 pr-3">{money(l.adjusted_amount_paise ?? l.amount_paise)}</td>
                  <td className={`py-2.5 ${l.outstanding_paise ? "text-amber-700" : "text-emerald-700"}`}>
                    {l.outstanding_paise ? money(l.outstanding_paise) : "Paid"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/dashboard/payments" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800">
          Open in payments ledger <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );

  if (ledgerError || !ledger)
    return (
      <section className={card}>
        <StepHeading
          icon={Split}
          title="Instalment plan"
          text={
            ledgerError
              ? "Instalment plans are agreed by an administrator in the payments ledger. Share the quote details with them to continue."
              : "Loading the payments ledger…"
          }
        />
      </section>
    );

  const sum = rows.reduce((n, r) => n + (/^\d+(\.\d{1,2})?$/.test(r.amount) ? Math.round(Number(r.amount) * 100) : 0), 0);
  const balanced = sum === quote.total_paise;
  const split = (n: number) => {
    const each = Math.floor(quote.total_paise / n);
    const start = new Date(billedOn + "T00:00:00");
    setRows(
      Array.from({ length: n }, (_, i) => {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        const amount = i === n - 1 ? quote.total_paise - each * (n - 1) : each;
        return { amount: (amount / 100).toFixed(2), date: d.toLocaleDateString("en-CA") };
      }),
    );
    forget("plan");
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!balanced) return setProblem(`Instalments must add up to ${money(quote.total_paise)}.`);
    let installments;
    try {
      installments = rows.map((r) => ({ amount_paise: paise(r.amount), due_on: r.date }));
    } catch (err) {
      return setProblem(errorMessage(err));
    }
    rememberBatch(lead.id, batchId);
    void run(
      "plan",
      () =>
        feeLedger.create({
          request_id: requestId("plan"),
          user_id: quote.user_id,
          course_id: quote.course_id,
          batch_id: batchId || null,
          mode: ledger!.mode,
          marked_price_paise: quote.marked_price_paise,
          discount_bps: quote.discount_bps,
          billed_on: billedOn,
          installments,
        }),
      "Instalment plan agreed. No money has been collected yet.",
    );
  }

  return (
    <form onSubmit={submit} className={card}>
      <StepHeading
        icon={Split}
        title="Instalment plan"
        text="Split the quoted fee into agreed instalments. The plan appears in the payments ledger once saved."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Quote
          <Select
            aria-label="Quote"
            className={input}
            value={quote.id}
            onChange={(e) => {
              setQuoteId(e.target.value);
              const q = quotes.find((x) => x.id === e.target.value);
              if (q) setRows([{ amount: String(q.total_paise / 100), date: billedOn }]);
              forget("plan");
            }}
          >
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.course_title} · {money(q.total_paise)}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Batch
          <Select
            aria-label="Plan batch"
            className={input}
            value={batches.some((b) => b.id === batchId) ? batchId : ""}
            onChange={(e) => {
              setBatchId(e.target.value);
              forget("plan");
            }}
          >
            <option value="">Unassigned</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {[b.code, b.trainer_name].filter(Boolean).join(" · ")}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Billing date
          <input
            type="date"
            className={input}
            required
            max={indiaToday()}
            value={billedOn}
            onChange={(e) => {
              setBilledOn(e.target.value);
              forget("plan");
            }}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">Instalments</h4>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" onClick={() => split(n)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {n === 1 ? "Full payment" : `${n} monthly`}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <span className="w-6 text-sm text-slate-500">#{i + 1}</span>
            <input
              aria-label={`Instalment ${i + 1} amount (INR)`}
              type="number"
              min="1"
              step="0.01"
              required
              className={input + " !mt-0"}
              value={r.amount}
              onChange={(e) => {
                setRows((v) => v.map((x, n) => (n === i ? { ...x, amount: e.target.value } : x)));
                forget("plan");
              }}
            />
            <input
              aria-label={`Instalment ${i + 1} due date`}
              type="date"
              required
              className={input + " !mt-0"}
              value={r.date}
              onChange={(e) => {
                setRows((v) => v.map((x, n) => (n === i ? { ...x, date: e.target.value } : x)));
                forget("plan");
              }}
            />
            <button
              type="button"
              aria-label={`Remove instalment ${i + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((v) => v.filter((_, n) => n !== i))}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setRows((v) => [...v, { amount: "", date: billedOn }])}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
      >
        <Plus size={16} aria-hidden="true" /> Add instalment
      </button>
      <p className={`mt-4 text-sm ${balanced ? "text-slate-600" : "text-amber-700"}`}>
        Scheduled {money(sum)} of {money(quote.total_paise)}
        {!balanced && ` · ${money(Math.abs(quote.total_paise - sum))} ${sum > quote.total_paise ? "over" : "remaining"}`}
      </p>
      <button className={primary + " mt-5"} disabled={!!busy || !balanced}>
        {busy === "plan" ? "Saving…" : "Agree instalment plan"}
      </button>
    </form>
  );
}

/* ---------- New onboarding ---------- */

function NewOnboarding({ close, created }: { close: () => void; created: (id: string) => Promise<void> }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, close]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem("");
    try {
      const r = await api.learningRequest<{ id: string }>("POST", "/enquiries", {
        request_id: requestId.current,
        ...form,
        consent,
        source_page: "/admin/onboarding",
      });
      await created(r.id);
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const field = (k: keyof typeof form, label: string, type = "text") => (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        ref={k === "name" ? first : undefined}
        className={input}
        type={type}
        required
        maxLength={k === "email" ? 254 : k === "interest" ? 255 : 120}
        value={form[k]}
        onChange={(e) => {
          setForm({ ...form, [k]: e.target.value });
          requestId.current = crypto.randomUUID();
        }}
      />
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && !busy && close()}>
      <form role="dialog" aria-modal="true" aria-labelledby="new-onboarding-title" onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 id="new-onboarding-title" className="text-lg font-semibold text-slate-900">New onboarding</h2>
            <p className="mt-1 text-sm text-slate-500">Start with the contact details from the call. You can complete the full profile next.</p>
          </div>
          <button type="button" aria-label="Close" disabled={busy} onClick={close} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </header>
        <div className="space-y-4 p-5">
          {problem && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{problem}</p>}
          {field("name", "Full name")}
          <div className="grid gap-4 sm:grid-cols-2">
            {field("email", "Email address", "email")}
            {field("phone", "Phone / WhatsApp", "tel")}
          </div>
          {field("interest", "Course interest")}
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary-600" />
            The student agreed to be contacted about courses and onboarding.
          </label>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button type="button" className={secondary} disabled={busy} onClick={close}>Cancel</button>
          <button className={primary} disabled={busy}>{busy ? "Creating…" : "Start onboarding"}</button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

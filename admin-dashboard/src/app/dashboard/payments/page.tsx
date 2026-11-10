"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  feeLedger,
  FeeAccount,
  FeeDetail,
  LedgerReport,
} from "@/services/feeLedger";
import { money } from "@/services/billing";
import { errorMessage } from "@/services/learning";
import { ChevronDown, ChevronRight, Download, X } from "lucide-react";
const input = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const button =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-slate-50";
const primary =
  "rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800";
const indiaToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const amount = (value: FormDataEntryValue | null) => {
  const raw = String(value || "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw))
    throw Error("Enter an INR amount with at most two decimals.");
  return Math.round(Number(raw) * 100);
};
const label = (s: string) => s.replaceAll("_", " ");
const ageLabels: Record<string, string> = {
  not_due: "Not yet due",
  "1_15": "1–15 days",
  "16_30": "16–30 days",
  "31_60": "31–60 days",
  "60_plus": "60+ days",
};
function Dialog({
  title,
  close,
  children,
  error,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="w-[min(1100px,96vw)] rounded-xl border p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={close} aria-label="Close dialog" className={button}>
          <X size={18} />
        </button>
      </header>
      <div className="max-h-[80vh] overflow-auto p-5">
        {error && (
          <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">
            {error}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
export default function PaymentsLedger() {
  const [report, setReport] = useState<LedgerReport | null>(null),
    [problem, setProblem] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [asOf, setAsOf] = useState(indiaToday),
    [mode, setMode] = useState(""),
    [search, setSearch] = useState(""),
    [course, setCourse] = useState(""),
    [trainer, setTrainer] = useState(""),
    [month, setMonth] = useState(""),
    [sort, setSort] = useState("outstanding"),
    [status, setStatus] = useState("all"),
    [age, setAge] = useState(""),
    [view, setView] = useState("batch");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}),
    [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<FeeDetail | null>(null),
    [create, setCreate] = useState(false),
    [newBatch, setNewBatch] = useState(false);
  const [plan, setPlan] = useState<{ amount: string; date: string }[]>([]);
  const requestIds = useRef(new Map<string, string>());
  const request = (key: string, payload: Record<string, unknown>) => {
    const signature = key + JSON.stringify(payload);
    let id = requestIds.current.get(signature);
    if (!id) {
      id = crypto.randomUUID();
      requestIds.current.set(signature, id);
    }
    return { ...payload, request_id: id };
  };
  const query = useMemo(() => {
    const q = new URLSearchParams({ as_of: asOf, sort, status });
    for (const [k, v] of Object.entries({
      mode,
      search,
      course_id: course,
      trainer_id: trainer,
      month,
      age,
    }))
      if (v) q.set(k, v);
    return q;
  }, [asOf, sort, status, mode, search, course, trainer, month, age]);
  const seq = useRef(0);
  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const r = await feeLedger.report(query);
      if (n === seq.current) {
        setReport(r);
        setProblem("");
      }
    } catch (e) {
      if (n === seq.current) setProblem(errorMessage(e));
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    let live = true;
    if (selected) {
      setDetail(null);
      feeLedger
        .detail(selected, asOf)
        .then((d) => {
          if (live) setDetail(d);
        })
        .catch((e) => {
          if (live) setProblem(errorMessage(e));
        });
    }
    return () => {
      live = false;
    };
  }, [selected, asOf]);
  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setProblem("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      await load();
      if (selected) setDetail(await feeLedger.detail(selected, asOf));
    } catch (e) {
      setProblem(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sub: string; rows: FeeAccount[] }
    >();
    for (const a of report?.accounts || []) {
      const key =
        view === "course"
          ? a.course_id
          : view === "student"
            ? a.user_id
            : a.batch_code || "unassigned:" + a.course_id;
      let group = map.get(key);
      if (!group) {
        group = {
          name:
            view === "course"
              ? a.course_title
              : view === "student"
                ? a.name
                : a.batch_code || "Unassigned batch",
          sub:
            view === "student"
              ? a.email
              : view === "course"
                ? ""
                : `${a.course_title} · ${a.trainer_name || "Trainer unassigned"}${a.batch_start ? " · " + a.batch_start.slice(0, 7) : ""}`,
          rows: [],
        };
        map.set(key, group);
      }
      group.rows.push(a);
    }
    return Array.from(map.entries());
  }, [report, view]);
  const trainers = useMemo(
    () =>
      Array.from(
        new Map(
          (report?.batches || [])
            .filter((b) => b.trainer_id)
            .map((b) => [b.trainer_id!, b.trainer_name || b.trainer_id!]),
        ).entries(),
      ),
    [report],
  );
  const months = useMemo(
    () =>
      Array.from(
        new Set((report?.batches || []).map((b) => b.starts_on.slice(0, 7))),
      )
        .sort()
        .reverse(),
    [report],
  );
  const isHistorical = asOf !== indiaToday();
  function open(a: FeeAccount) {
    setSelected(a.id);
  }
  const footer = (a: FeeAccount) => (
    <>
      <td className="p-3 text-right">{money(a.billed_paise)}</td>
      <td className="p-3 text-right text-emerald-700">{money(a.paid_paise)}</td>
      <td className="p-3 text-right font-semibold">
        {money(a.outstanding_paise)}
      </td>
      <td className="p-3">
        <div className="h-1.5 w-20 rounded bg-slate-100">
          <div
            className="h-1.5 rounded bg-teal-500"
            style={{
              width: `${Math.max(0, Math.min(100, a.billed_paise ? (100 * a.paid_paise) / a.billed_paise : 0))}%`,
            }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {a.billed_paise
            ? Math.round((100 * a.paid_paise) / a.billed_paise)
            : 0}
          %
        </span>
      </td>
      <td className="p-3">
        {a.next_due?.date || "—"}
        {a.next_due && (
          <div className="text-xs text-slate-500">
            Installment {a.next_due.number} of {a.installments.length}
          </div>
        )}
      </td>
      <td className="p-3 text-red-600">
        {a.overdue_days ? `${a.overdue_days} days` : "—"}
        {a.overdue_paise > 0 && (
          <div className="text-xs">{money(a.overdue_paise)} missed</div>
        )}
      </td>
      <td className="p-3">
        <span
          className={`rounded-full px-2 py-1 text-xs ${a.status === "overdue" ? "bg-red-50 text-red-700" : a.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100"}`}
        >
          {label(a.status)}
        </span>
      </td>
      <td className="p-3">
        <button
          className={button}
          onClick={() => open(a)}
          aria-label={`Open ${a.name} ${a.course_title}`}
        >
          Open
        </button>
      </td>
    </>
  );
  return (
    <div className="space-y-5 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payments ledger</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track fees, cleared collections and dues by batch, course or
            student.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            As of{" "}
            <input
              aria-label="As of"
              className={input}
              type="date"
              value={asOf}
              max={indiaToday()}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </label>
          <select
            aria-label="Payment mode"
            className={input}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="">
              Current Razorpay mode{report?.mode ? ` (${report.mode})` : ""}
            </option>
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
          <button
            className={button}
            disabled={!report || busy}
            onClick={() =>
              run(
                () =>
                  feeLedger.download(
                    "/export?" + query,
                    "AI4Impact-payments-ledger.csv",
                  ),
                "CSV downloaded.",
              )
            }
          >
            <Download size={14} className="mr-1 inline" />
            Export CSV
          </button>
          <button
            className={primary}
            disabled={isHistorical}
            onClick={() => {
              setCreate(true);
              setPlan([{ amount: "", date: indiaToday() }]);
            }}
          >
            New fee plan
          </button>
          <button className={button} onClick={() => setNewBatch(true)}>
            New batch
          </button>
        </div>
      </div>
      {problem && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {problem}
          <button className="ml-3 underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {report?.mode === "test" && (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          TEST MODE — simulated Razorpay payments and test fee plans. These are
          not live revenue.
        </p>
      )}
      {isHistorical && (
        <p className="rounded bg-blue-50 p-3 text-sm">
          Historical view: balances use recorded events up to the end of {asOf}{" "}
          in Asia/Kolkata. Payment actions are disabled.
        </p>
      )}
      <section
        aria-label="Ledger totals"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {[
          [
            "Total billed",
            "billed_paise",
            `${report?.totals.enrollments || 0} fee accounts`,
          ],
          ["Collected", "paid_paise", "Cleared, net of refunds"],
          [
            "Outstanding",
            "outstanding_paise",
            `${report?.totals.students_owing || 0} students owe`,
          ],
          [
            "Due date missed",
            "overdue_paise",
            `${report?.totals.overdue_students || 0} students · oldest ${report?.totals.oldest_days || 0}d`,
          ],
          [
            "Failed / expired",
            "failed_attempts",
            `${report?.totals.expired_checkouts || 0} expired checkouts · 30 days`,
          ],
        ].map(([title, key, sub]) => (
          <article key={key} className="rounded-lg border bg-white p-4">
            <p className="text-xs text-slate-500">{title}</p>
            <p
              className={`mt-2 text-xl font-bold ${key === "paid_paise" ? "text-emerald-700" : key === "overdue_paise" ? "text-red-600" : ""}`}
            >
              {key === "failed_attempts"
                ? report?.totals[key] || 0
                : money(report?.totals[key] || 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          </article>
        ))}
      </section>
      <section className="rounded-lg border bg-white p-4">
        <div className="flex justify-between">
          <h2 className="text-sm font-semibold">Outstanding by age</h2>
          <span className="text-xs text-slate-500">
            Click a bucket to filter
          </span>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded bg-slate-100">
          {report?.aging.map((a, i) => (
            <div
              key={a.key}
              className={
                [
                  "bg-slate-300",
                  "bg-yellow-300",
                  "bg-orange-400",
                  "bg-red-400",
                  "bg-red-800",
                ][i]
              }
              style={{
                width: `${(100 * a.amount_paise) / Math.max(1, report.totals.outstanding_paise)}%`,
              }}
            />
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {report?.aging.map((a) => (
            <button
              aria-pressed={age === a.key}
              key={a.key}
              onClick={() => setAge(age === a.key ? "" : a.key)}
              className={`rounded border p-3 text-left ${age === a.key ? "border-blue-600 bg-blue-50" : ""}`}
            >
              <div className="text-xs text-slate-500">{ageLabels[a.key]}</div>
              <strong>{money(a.amount_paise)}</strong>
              <div className="text-xs text-slate-500">
                {a.students} students
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="flex rounded bg-slate-100 p-1">
            {["batch", "course", "student"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded px-3 py-1.5 text-sm ${view === v ? "bg-white shadow-sm" : ""}`}
              >
                By {v}
              </button>
            ))}
          </div>
          <input
            aria-label="Search ledger"
            className={input + " min-w-48 flex-1"}
            placeholder="Search student, email, batch, transaction or provider ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Course filter"
            className={input}
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="">All courses</option>
            {report?.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Trainer filter"
            className={input}
            value={trainer}
            onChange={(e) => setTrainer(e.target.value)}
          >
            <option value="">All trainers</option>
            {trainers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Batch month"
            className={input}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">All batch months</option>
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Sort ledger"
            className={input}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="outstanding">Sort: Outstanding ↓</option>
            <option value="name">Sort: Student name</option>
            <option value="due">Sort: Next due</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 border-b p-3">
          {[
            ["all", "All"],
            ["overdue", "Due date missed"],
            ["due_7", "Due in 7 days"],
            ["part_paid", "Part-paid"],
            ["unpaid", "Nothing paid"],
            ["failed", "Failed attempts"],
            ["paid", "Paid in full"],
          ].map(([v, title]) => (
            <button
              key={v}
              aria-pressed={status === v}
              onClick={() => setStatus(v)}
              className={`rounded-full border px-3 py-1 text-xs ${status === v ? "bg-slate-800 text-white" : ""}`}
            >
              {title}
            </button>
          ))}
          {age && (
            <button className="text-xs underline" onClick={() => setAge("")}>
              Clear age filter
            </button>
          )}
        </div>
        <div className="overflow-x-auto" aria-busy={loading}>
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {[
                  "Batch · Course · Student",
                  "Plan",
                  "To be paid",
                  "Paid",
                  "Outstanding",
                  "Collected",
                  "Next due",
                  "Overdue for",
                  "Status",
                  "Open",
                ].map((x) => (
                  <th key={x} className="p-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([key, g]) => {
                const sum = (k: keyof FeeAccount) =>
                  g.rows.reduce((n, a) => n + Number(a[k] || 0), 0);
                return (
                  <Group
                    key={key}
                    name={g.name}
                    sub={g.sub}
                    rows={g.rows}
                    expanded={!!expanded[key]}
                    toggle={() =>
                      setExpanded((e) => ({ ...e, [key]: !e[key] }))
                    }
                    footer={footer}
                    sum={sum}
                  />
                );
              })}
            </tbody>
          </table>
          {!loading && report && !report.accounts.length && (
            <p className="p-10 text-center text-slate-500">
              No fee accounts match these filters. Create an agreed fee plan or
              collect a verified Razorpay payment.
            </p>
          )}
          {loading && (
            <p className="p-4 text-sm text-slate-500">Loading ledger…</p>
          )}
        </div>
        <p className="border-t p-3 text-xs text-slate-500">
          {groups.length} {view} groups · {report?.accounts.length || 0} fee
          accounts shown. Amounts in INR only; foreign currency conversion is
          not configured. {report?.scope}
        </p>
      </section>
      {(report?.attempts?.length || 0) > 0 && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold">
            Failed Razorpay attempts (last 30 days)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Showing up to 200 of {report?.attempt_count || 0}. An unsuccessful
            attempt is not collected money and does not by itself create an
            agreed fee obligation.
          </p>
          <div className="mt-3 overflow-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Student",
                    "Course",
                    "Payment reference",
                    "Failure code",
                    "Attempted",
                  ].map((x) => (
                    <th key={x} className="p-2">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report?.attempts?.map((a) => (
                  <tr className="border-t" key={a.provider_payment_id}>
                    <td className="p-2">
                      {a.buyer_name}
                      <p className="text-xs text-slate-500">{a.buyer_email}</p>
                    </td>
                    <td className="p-2">{a.course_title}</td>
                    <td className="p-2">{a.provider_payment_id}</td>
                    <td className="p-2">{a.reason || "Provider rejected"}</td>
                    <td className="p-2">
                      {new Date(a.attempted_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {selected && (
        <Dialog
          error={problem}
          title="Student payment trail"
          close={() => setSelected("")}
        >
          {detail ? (
            <FeePanel
              d={detail}
              busy={busy}
              historical={isHistorical}
              run={run}
              request={request}
            />
          ) : (
            <p>Loading payment trail…</p>
          )}
        </Dialog>
      )}
      {create && (
        <Dialog
          error={problem}
          title="Create agreed fee plan"
          close={() => setCreate(false)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                const r = await feeLedger.create(
                  request("account", {
                    buyer_email: f.get("email"),
                    course_id: f.get("course_id"),
                    batch_id: f.get("batch_id") || null,
                    mode: report?.mode || "test",
                    marked_price_paise: amount(f.get("price")),
                    discount_bps: Math.round(Number(f.get("discount")) * 100),
                    billed_on: f.get("billed_on"),
                    installments: plan.map((p) => ({
                      amount_paise: amount(p.amount),
                      due_on: p.date,
                    })),
                  }),
                );
                setCreate(false);
                setSelected(r.id);
              }, "Fee plan created; no money collected.");
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Existing student email
                <input
                  aria-label="Student email"
                  name="email"
                  type="email"
                  required
                  className={input + " w-full"}
                />
              </label>
              <label>
                Course
                <select
                  aria-label="Fee plan course"
                  name="course_id"
                  required
                  className={input + " w-full"}
                >
                  <option value="">Select course</option>
                  {report?.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Batch
                <select name="batch_id" className={input + " w-full"}>
                  <option value="">Unassigned</option>
                  {report?.batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Billing date
                <input
                  name="billed_on"
                  type="date"
                  max={indiaToday()}
                  defaultValue={indiaToday()}
                  required
                  className={input + " w-full"}
                />
              </label>
              <label>
                Marked fee (INR)
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  className={input + " w-full"}
                />
              </label>
              <label>
                Discount (%)
                <input
                  name="discount"
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.01"
                  defaultValue="0"
                  className={input + " w-full"}
                />
              </label>
            </div>
            <p className="text-sm text-slate-500">
              Mode: {report?.mode}. Installments must sum to the discounted fee.
              Access starts after the first installment is fully cleared.
            </p>
            <PlanEditor plan={plan} setPlan={setPlan} />
            <button className={primary} disabled={busy}>
              Create agreed fee plan
            </button>
          </form>
        </Dialog>
      )}
      {newBatch && (
        <Dialog
          error={problem}
          title="Create batch"
          close={() => setNewBatch(false)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await feeLedger.batch(
                  request("batch", {
                    code: f.get("code"),
                    course_id: f.get("course_id"),
                    starts_on: f.get("starts_on"),
                    trainer_email: f.get("trainer_email"),
                  }),
                );
                setNewBatch(false);
              }, "Batch created.");
            }}
          >
            <label className="block">
              Batch code
              <input
                name="code"
                maxLength={100}
                required
                className={input + " w-full"}
              />
            </label>
            <label className="block">
              Course
              <select name="course_id" required className={input + " w-full"}>
                {report?.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Trainer email (optional)
              <input
                name="trainer_email"
                type="email"
                className={input + " w-full"}
              />
            </label>
            <label className="block">
              Batch starts
              <input
                name="starts_on"
                type="date"
                required
                className={input + " w-full"}
              />
            </label>
            <button className={primary} disabled={busy}>
              Create batch
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
function PlanEditor({
  plan,
  setPlan,
}: {
  plan: { amount: string; date: string }[];
  setPlan: React.Dispatch<
    React.SetStateAction<{ amount: string; date: string }[]>
  >;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Installment schedule</h3>
      {plan.map((p, i) => (
        <div className="flex flex-wrap items-end gap-2" key={i}>
          <span>{i + 1}.</span>
          <label className="text-sm">
            Amount (INR)
            <input
              aria-label={`Installment ${i + 1} amount`}
              type="number"
              min="1"
              step="0.01"
              required
              value={p.amount}
              className={input + " ml-2"}
              onChange={(e) =>
                setPlan((v) =>
                  v.map((x, n) =>
                    n === i ? { ...x, amount: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="text-sm">
            Due date
            <input
              aria-label={`Installment ${i + 1} due date`}
              type="date"
              required
              value={p.date}
              className={input + " ml-2"}
              onChange={(e) =>
                setPlan((v) =>
                  v.map((x, n) =>
                    n === i ? { ...x, date: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          {plan.length > 1 && (
            <button
              type="button"
              className={button}
              aria-label={`Remove installment ${i + 1}`}
              onClick={() => setPlan((v) => v.filter((_, n) => n !== i))}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className={button}
        disabled={plan.length >= 24}
        onClick={() =>
          setPlan((v) => [
            ...v,
            { amount: "", date: v.at(-1)?.date || indiaToday() },
          ])
        }
      >
        Add installment
      </button>
    </div>
  );
}
function Group({
  name,
  sub,
  rows,
  expanded,
  toggle,
  footer,
  sum,
}: {
  name: string;
  sub: string;
  rows: FeeAccount[];
  expanded: boolean;
  toggle: () => void;
  footer: (a: FeeAccount) => React.ReactNode;
  sum: (k: keyof FeeAccount) => number;
}) {
  const next = rows
      .map((r) => r.next_due?.date)
      .filter(Boolean)
      .sort()[0],
    overdue = rows.filter((r) => r.overdue_paise > 0).length;
  return (
    <>
      <tr className="border-t bg-slate-50/50">
        <td className="p-3">
          <button
            className="flex items-start gap-2 text-left"
            onClick={toggle}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>
              <strong className="block">{name}</strong>
              <span className="text-xs text-slate-500">{sub}</span>
            </span>
          </button>
        </td>
        <td className="p-3 text-xs text-slate-500">
          {new Set(rows.map((r) => r.user_id)).size} students
        </td>
        <td className="p-3 text-right font-semibold">
          {money(sum("billed_paise"))}
        </td>
        <td className="p-3 text-right text-emerald-700">
          {money(sum("paid_paise"))}
        </td>
        <td className="p-3 text-right font-semibold">
          {money(sum("outstanding_paise"))}
        </td>
        <td className="p-3">
          {sum("billed_paise")
            ? Math.round((100 * sum("paid_paise")) / sum("billed_paise"))
            : 0}
          %
        </td>
        <td className="p-3">{next || "—"}</td>
        <td className="p-3 text-red-600">
          {overdue
            ? `up to ${Math.max(...rows.map((r) => r.overdue_days))} days`
            : "—"}
          {overdue > 0 && (
            <div className="text-xs">{money(sum("overdue_paise"))} missed</div>
          )}
        </td>
        <td className="p-3 text-xs">
          {overdue
            ? `${overdue} overdue`
            : sum("outstanding_paise")
              ? "On track"
              : "Settled"}
        </td>
        <td className="p-3">
          <button className={button} onClick={toggle}>
            {expanded ? "Collapse" : "Expand"}
          </button>
        </td>
      </tr>
      {expanded &&
        rows.map((a) => (
          <tr className="border-t" key={a.id}>
            <td className="p-3 pl-9">
              <strong>{a.name}</strong>
              <p className="text-xs text-slate-500">{a.email}</p>
            </td>
            <td className="p-3 text-xs">
              {a.installments.length} installments
              {a.discount_bps > 0 && <div>{a.discount_bps / 100}% off</div>}
            </td>
            {footer(a)}
          </tr>
        ))}
    </>
  );
}
function FeePanel({
  d,
  busy,
  historical,
  run,
  request,
}: {
  d: FeeDetail;
  busy: boolean;
  historical: boolean;
  run: (f: () => Promise<unknown>, message: string) => Promise<void>;
  request: (
    key: string,
    payload: Record<string, unknown>,
  ) => Record<string, unknown>;
}) {
  const [receiptIntent, setReceiptIntent] = useState(""),
    [emailIntent, setEmailIntent] = useState("");
  const [action, setAction] = useState(""),
    [plan, setPlan] = useState<{ amount: string; date: string }[]>([]),
    [link, setLink] = useState(""),
    [qr, setQr] = useState(""),
    [fromDate, setFromDate] = useState(d.billed_on),
    [preview, setPreview] = useState<{
      recipient: string;
      subject: string;
      body: string;
      template: string;
      attachment: string;
    } | null>(null);
  const disabled = busy || historical;
  const email = (kind: string) => {
    void run(async () => {
      setPreview(await feeLedger.preview(d.id, kind, d.as_of, fromDate));
      setEmailIntent(crypto.randomUUID());
      setAction(kind);
    }, "Email preview prepared; review before sending.");
  };
  const change = (id: string, a: string) => {
    const reason = window.prompt(
      a === "clear"
        ? "Clearance reference / confirmation"
        : "Reason for reversal or void",
    );
    if (reason)
      void run(
        () =>
          feeLedger.changeReceipt(
            d.id,
            id,
            request(a + id, { action: a, reason }),
          ),
        "Receipt updated; audit history preserved.",
      );
  };
  return (
    <div className="space-y-5">
      <header>
        <h3 className="text-xl font-bold">{d.name}</h3>
        <p className="text-sm text-slate-500">
          {d.email} · {d.course_title} · {d.mode.toUpperCase()}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Billed", d.billed_paise],
          ["Collected", d.paid_paise],
          ["Outstanding", d.outstanding_paise],
          ["Credit", d.credit_paise],
        ].map(([l, n]) => (
          <div key={String(l)} className="rounded border p-3">
            <span className="block text-xs text-slate-500">{l}</span>
            <strong>{money(Number(n))}</strong>
          </div>
        ))}
      </div>
      <fieldset disabled={disabled} className="flex flex-wrap gap-2">
        <button
          className={button}
          onClick={() =>
            void run(async () => {
              const r = await feeLedger.link(d.id, request("link" + d.id, {}));
              setLink(r.checkout_url);
              setQr(await QRCode.toDataURL(r.checkout_url, { width: 220 }));
            }, "Secure checkout link created.")
          }
        >
          Create payment link
        </button>
        <button
          className={button}
          onClick={() => {
            if (action !== "receipt") setReceiptIntent(crypto.randomUUID());
            setAction(action === "receipt" ? "" : "receipt");
          }}
        >
          Record offline payment
        </button>
        <button
          className={button}
          disabled={!!d.source_order_id}
          onClick={() => {
            setPlan(
              d.installments.map((l) => ({
                amount: String(l.amount_paise / 100),
                date: l.due_on,
              })),
            );
            setAction(action === "plan" ? "" : "plan");
          }}
        >
          Edit installment plan
        </button>
        <button className={button} onClick={() => email("reminder")}>
          Send email reminder
        </button>
        <button className={button} disabled>
          WhatsApp / SMS not configured
        </button>
      </fieldset>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          Statement from
          <input
            aria-label="Statement from"
            type="date"
            min={d.billed_on}
            max={d.as_of}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={input + " block"}
          />
        </label>
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void run(
              () =>
                feeLedger.download(
                  `/accounts/${d.id}/statement?as_of=${d.as_of}&from_on=${fromDate}&format=pdf`,
                  "AI4Impact-statement.pdf",
                ),
              "Statement PDF downloaded.",
            )
          }
        >
          Download statement PDF
        </button>
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void run(
              () =>
                feeLedger.download(
                  `/accounts/${d.id}/statement?as_of=${d.as_of}&from_on=${fromDate}&format=csv`,
                  "AI4Impact-statement.csv",
                ),
              "Statement CSV downloaded.",
            )
          }
        >
          Download statement CSV
        </button>
        <button
          className={button}
          disabled={disabled}
          onClick={() => email("statement")}
        >
          Email statement
        </button>
      </div>
      {link && (
        <div className="rounded border bg-slate-50 p-4">
          <label className="block">
            Secure payment link
            <input
              aria-label="Secure payment link"
              readOnly
              value={link}
              className={input + " mt-2 w-full"}
            />
          </label>
          <button
            className={button + " mt-2"}
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .catch(() => window.alert("Select and copy the link manually."))
            }
          >
            Copy link
          </button>
          {qr && (
            <img
              src={qr}
              width={220}
              height={220}
              alt="QR code for this student payment link"
            />
          )}
          <p className="text-xs text-slate-500">
            Student must sign in as {d.email}. Scanning does not confirm
            payment.
          </p>
        </div>
      )}
      {preview && ["reminder", "statement"].includes(action) && (
        <section className="space-y-3 rounded border bg-slate-50 p-4">
          <h3 className="font-semibold">Email preview</h3>
          <p className="text-sm">
            To: {preview.recipient}
            <br />
            Subject: {preview.subject}
          </p>
          <pre className="whitespace-pre-wrap text-sm">{preview.body}</pre>
          <p className="text-xs text-slate-500">
            Template: {preview.template} · Attachment: {preview.attachment}
          </p>
          <button
            className={primary}
            disabled={disabled}
            onClick={() =>
              void run(async () => {
                await feeLedger.email(
                  d.id,
                  request(action + d.id + emailIntent, {
                    kind: action,
                    as_of: d.as_of,
                    from_on: fromDate,
                  }),
                );
                setAction("");
                setPreview(null);
              }, "Email queued; delivery status will appear below.")
            }
          >
            Send {action} email
          </button>
        </section>
      )}
      {action === "receipt" && (
        <form
          className="grid gap-3 rounded border bg-slate-50 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(async () => {
              await feeLedger.receipt(
                d.id,
                request("receipt" + d.id + receiptIntent, {
                  method: f.get("method"),
                  amount_paise: amount(f.get("amount")),
                  reference: f.get("reference"),
                  received_on: f.get("received_on"),
                  note: f.get("note"),
                }),
              );
              setAction("");
            }, "Offline receipt recorded; only cleared funds count.");
          }}
        >
          <label>
            Method
            <select name="method" className={input + " w-full"}>
              <option value="bank">Bank transfer received</option>
              <option value="offline_upi">
                Offline UPI (outside Razorpay)
              </option>
              <option value="cash">Cash received</option>
              <option value="cheque">Cheque - pending clearance</option>
            </select>
          </label>
          <label>
            Amount (INR)
            <input
              aria-label="Offline amount INR"
              name="amount"
              type="number"
              required
              min="1"
              step="0.01"
              className={input + " w-full"}
            />
          </label>
          <label>
            Payment reference
            <input
              name="reference"
              maxLength={200}
              className={input + " w-full"}
            />
          </label>
          <label>
            Received on
            <input
              type="date"
              name="received_on"
              required
              max={indiaToday()}
              defaultValue={indiaToday()}
              className={input + " w-full"}
            />
          </label>
          <label>
            Note
            <textarea
              name="note"
              maxLength={1000}
              className={input + " w-full"}
            />
          </label>
          <p className="text-xs text-amber-800">
            Do not enter payments already collected through Razorpay. Cheques
            count only after clearance.
          </p>
          <button className={primary} disabled={disabled}>
            Save offline payment
          </button>
        </form>
      )}
      {action === "plan" && (
        <form
          className="space-y-3 rounded border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await feeLedger.plan(
                d.id,
                request("plan" + d.id, {
                  version: d.version,
                  installments: plan.map((p) => ({
                    amount_paise: amount(p.amount),
                    due_on: p.date,
                  })),
                }),
              );
              setAction("");
            }, "Plan updated; earlier versions retained.");
          }}
        >
          <p className="text-sm">
            Agreed total: {money(d.total_paise)}. Keep paid/partly paid
            installments unchanged.
          </p>
          <PlanEditor plan={plan} setPlan={setPlan} />
          <button className={primary} disabled={disabled}>
            Save installment plan
          </button>
        </form>
      )}
      <h3 className="font-semibold">Installments</h3>
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {["No.", "Due", "Agreed", "Paid", "Outstanding"].map((x) => (
                <th className="p-2" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.installments.map((l) => (
              <tr className="border-t" key={l.id}>
                <td className="p-2">{l.number}</td>
                <td className="p-2">{l.due_on}</td>
                <td className="p-2">{money(l.adjusted_amount_paise)}</td>
                <td className="p-2">{money(l.paid_paise)}</td>
                <td className="p-2">{money(l.outstanding_paise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="font-semibold">Cleared payment trail</h3>
      {d.entries.map((e) => (
        <div
          key={e.id}
          className="flex flex-wrap justify-between gap-2 rounded border p-3 text-sm"
        >
          <div>
            <strong>{label(e.kind)}</strong>
            <p className="text-xs text-slate-500">
              Effective {e.effective_at.slice(0, 10)} · recorded{" "}
              {new Date(e.created_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </p>
            <p className="break-all text-xs">
              {e.reference || "No external reference"} · {e.note}
            </p>
          </div>
          <strong>{money(e.amount_paise)}</strong>
        </div>
      ))}
      {!d.entries.length && (
        <p className="text-sm text-slate-500">
          No cleared collections recorded.
        </p>
      )}
      <h3 className="font-semibold">Offline receipts (current status)</h3>
      {d.receipts.map((r) => (
        <div
          key={r.id}
          className="flex flex-wrap justify-between gap-2 rounded border p-3 text-sm"
        >
          <div>
            {label(r.method)} · {money(r.amount_paise)} · {r.status}
            <p className="text-xs text-slate-500">
              {r.reference} · received {r.received_on}
            </p>
          </div>
          <div className="flex gap-2">
            {r.status === "pending" && (
              <button
                className={button}
                disabled={disabled}
                onClick={() => change(r.id, "clear")}
              >
                Mark cleared
              </button>
            )}
            {r.status !== "reversed" && (
              <button
                className={button}
                disabled={disabled}
                onClick={() => change(r.id, "reverse")}
              >
                Reverse / void
              </button>
            )}
          </div>
        </div>
      ))}
      <h3 className="font-semibold">Razorpay transactions (current status)</h3>
      {d.orders.map((o) => (
        <div className="rounded border p-3 text-sm" key={o.id}>
          {o.status} · {money(o.total_paise)}
          <p className="break-all text-xs text-slate-500">
            {o.provider_payment_id || "No verified capture"} ·{" "}
            {o.provider_order_id || "Order not prepared"}
          </p>
        </div>
      ))}
      <h3 className="font-semibold">Email delivery (current status)</h3>
      {d.emails?.map((e, i) => (
        <div key={i} className="rounded border p-2 text-sm">
          {e.title} · {e.status}
          <p className="text-xs text-slate-500">
            {e.created_at}
            {e.error_code ? " · " + e.error_code : ""}
          </p>
        </div>
      ))}
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Activity and audit log
        </summary>
        {d.audit.map((a, i) => (
          <div key={i} className="mt-2 rounded border p-2 text-xs">
            {a.action} ·{" "}
            {new Date(a.created_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}
            <pre className="whitespace-pre-wrap break-all text-slate-500">
              {JSON.stringify(a.details, null, 2)}
            </pre>
          </div>
        ))}
      </details>
    </div>
  );
}

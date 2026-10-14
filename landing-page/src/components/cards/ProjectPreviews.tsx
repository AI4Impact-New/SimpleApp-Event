import type { ReactNode } from "react";

function Key({ children }: { children: string }) {
  return <span className="text-(--teal-400)">{children}</span>;
}

export const ApiPreview = (
  <pre className="font-[inherit] whitespace-pre-wrap">
    {"{\n  "}
    <Key>&quot;transaction_id&quot;</Key>
    {': "txn_8816",\n  '}
    <Key>&quot;score&quot;</Key>
    {": "}
    <span className="text-(--amber-500)">0.87</span>
    {",\n  "}
    <Key>&quot;decision&quot;</Key>
    {': "review",\n  '}
    <Key>&quot;latency_ms&quot;</Key>
    {": 41\n}"}
  </pre>
);

const TRACE = [
  { step: "plan", text: "Investigate dispute D-2291" },
  { step: "tool", text: "get_transactions(card=•4421)" },
  { step: "tool", text: "check_rule(scheme=visa, code=13.1)" },
  { step: "draft", text: "Evidence supports merchant" },
  { step: "wait", text: "Analyst approval required" },
];

const AgentTracePreview = (
  <dl className="grid grid-cols-[auto_1fr] gap-x-(--space-4)">
    {TRACE.map((t, i) => (
      <div key={i} className="contents">
        <dt className={t.step === "wait" ? "text-(--amber-500)" : "text-(--teal-400)"}>{t.step}</dt>
        <dd className="truncate">{t.text}</dd>
      </div>
    ))}
  </dl>
);

const PrdPreview = (
  <div>
    <div className="font-(family-name:--font-body) font-semibold text-(--text-on-dark)">## Problem</div>
    <div aria-hidden className="mt-(--space-2) flex flex-col gap-(--space-2)">
      <span className="h-(--space-1) w-11/12 rounded-(--radius-pill) bg-(--navy-500)" />
      <span className="h-(--space-1) w-3/4 rounded-(--radius-pill) bg-(--navy-500)" />
    </div>
    <div className="mt-(--space-4) font-(family-name:--font-body) font-semibold text-(--text-on-dark)">
      ## Success metrics
    </div>
    <div>
      – Manual effort <span className="text-(--amber-500)">-60%</span>
    </div>
    <div>
      – First-response time <span className="text-(--teal-400)">&lt; 2h</span>
    </div>
  </div>
);

const FEATURES = [
  { name: "txn_velocity_1h", width: "w-full" },
  { name: "device_age_days", width: "w-full" },
  { name: "merchant_risk", width: "w-11/12" },
  { name: "amount_zscore", width: "w-2/3" },
];

const ModelCardPreview = (
  <div>
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-(--space-4) gap-y-(--space-2)">
      {FEATURES.map((f) => (
        <div key={f.name} className="contents">
          <span>{f.name}</span>
          <span aria-hidden className={`h-(--space-1) rounded-(--radius-pill) bg-(--teal-400) ${f.width}`} />
        </div>
      ))}
    </div>
    <div className="mt-(--space-3)">
      PR-AUC <span className="text-(--amber-500)">0.81</span> · threshold 0.62
    </div>
  </div>
);

/** Retention cohort: rows are signup months, columns months since signup; null cells haven't happened yet. */
const COHORTS = [
  [100, 80, 64, 52, 40, 30],
  [100, 78, 60, 48, 36, null],
  [100, 75, 58, 44, null, null],
  [100, 72, 55, null, null, null],
];

const NotebookPreview = (
  <div>
    <div>
      In [7]: <span className="text-(--text-on-dark)">cohort.pivot(index=</span>
      <span className="text-(--amber-500)">&apos;month&apos;</span>
      <span className="text-(--text-on-dark)">)</span>
    </div>
    <div aria-hidden className="mt-(--space-2) grid grid-cols-6 gap-px">
      {COHORTS.flat().map((v, i) => (
        <span
          key={i}
          className="h-(--space-3) bg-(--teal-400)"
          style={{ opacity: v === null ? 0.08 : 0.2 + (v / 100) * 0.8 }}
        />
      ))}
    </div>
    <div className="mt-(--space-2)">Retention drops 38% after month 2</div>
  </div>
);

function Cite({ children }: { children: string }) {
  return (
    <span className="ml-(--space-1) rounded-(--radius-xs) bg-(--teal-400)/20 px-(--space-1) text-(--teal-400)">
      {children}
    </span>
  );
}

const CitedAnswerPreview = (
  <div className="flex flex-col gap-(--space-2) font-(family-name:--font-body)">
    <div className="ml-auto max-w-[80%] rounded-(--radius-md) bg-(--navy-500) px-(--space-3) py-(--space-2) text-(--text-on-dark)">
      What is the chargeback window for card-not-present fraud?
    </div>
    <div className="max-w-[80%] rounded-(--radius-md) border border-(--navy-500) px-(--space-3) py-(--space-2)">
      120 days from the transaction date for most schemes
      <Cite>[1]</Cite>
      <Cite>[2]</Cite>
    </div>
    <div className="font-(family-name:--font-mono)">grounded: 2/2 · faithfulness 0.94</div>
  </div>
);

function Node({ children, tone }: { children: string; tone?: "teal" | "amber" }) {
  const color =
    tone === "teal"
      ? "border-(--teal-400) text-(--teal-400)"
      : tone === "amber"
        ? "border-(--amber-500) text-(--amber-500)"
        : "border-(--navy-500) text-(--text-on-dark)";
  return <span className={`rounded-(--radius-xs) border px-(--space-2) py-(--space-1) ${color}`}>{children}</span>;
}

const WorkflowPreview = (
  <div>
    <div className="flex flex-wrap items-center gap-(--space-2)">
      <Node>trigger</Node>→<Node tone="teal">LLM classify</Node>→<Node>route</Node>
    </div>
    <div className="mt-(--space-2) flex items-center gap-(--space-2) pl-(--space-16)">
      ↳ <Node tone="amber">human review</Node>
    </div>
    <div className="mt-(--space-3)">auto-resolved 71% · escalated 29%</div>
  </div>
);

const DagPreview = (
  <div>
    <div className="flex flex-wrap items-center gap-(--space-2)">
      <Node tone="teal">extract</Node>→<Node tone="teal">validate</Node>→<Node tone="teal">load</Node>→
      <Node tone="teal">dbt run</Node>→<Node tone="amber">test</Node>
    </div>
    <div className="mt-(--space-3)">rows_loaded=1,284,512 · null_rate=0.02% · sla=met</div>
  </div>
);

const STREAM = [
  { id: "txn_8812", amount: "₹42,300", signal: "velocity>5/min", risk: "HIGH" },
  { id: "txn_8813", amount: "₹1,250", signal: "ok", risk: "LOW" },
  { id: "txn_8814", amount: "₹18,900", signal: "new_device", risk: "MED" },
  { id: "txn_8815", amount: "₹640", signal: "ok", risk: "LOW" },
  { id: "txn_8816", amount: "₹77,000", signal: "geo_mismatch", risk: "HIGH" },
];

const StreamPreview = (
  <div className="grid grid-cols-[auto_auto_1fr_auto] gap-x-(--space-4)">
    {STREAM.map((r) => (
      <div key={r.id} className="contents">
        <span>{r.id}</span>
        <span className="text-(--text-on-dark)">{r.amount}</span>
        <span className="truncate">{r.signal}</span>
        <span className={r.risk === "LOW" ? "text-(--teal-400)" : "text-(--amber-500)"}>{r.risk}</span>
      </div>
    ))}
  </div>
);

const SqlPreview = (
  <pre className="font-[inherit] whitespace-pre-wrap">
    <Key>select</Key>
    {"\n  d.merchant_id,\n  sum(f.amount_inr) as gmv,\n  count_if(f.is_refund) as refunds\n"}
    <Key>from</Key>
    {" {{ ref('fct_payments') }} f\n"}
    <Key>join</Key>
    {" {{ ref('dim_merchant') }} d"}
  </pre>
);

const KPIS = [
  { label: "Auth rate", value: "94.1%" },
  { label: "Failed", value: "3.2%" },
  { label: "Drop-off", value: "12%" },
];
/** Bar heights as a % of the chart; the last bar is the highlighted current period. */
const BARS = [40, 60, 52, 75, 65, 90, 80, 100, 92, 100];

const DashboardPreview = (
  <div>
    <div className="grid grid-cols-3 gap-(--space-2)">
      {KPIS.map((k) => (
        <div key={k.label} className="rounded-(--radius-xs) border border-(--navy-500) px-(--space-2) py-(--space-1)">
          <div>{k.label}</div>
          <div className="text-(--text-on-dark)">{k.value}</div>
        </div>
      ))}
    </div>
    <div aria-hidden className="mt-(--space-3) flex h-(--space-12) items-end gap-(--space-2)">
      {BARS.map((h, i) => (
        <span
          key={i}
          className={`flex-1 rounded-(--radius-xs) ${i === BARS.length - 1 ? "bg-(--amber-500)" : "bg-(--teal-400)/70"}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  </div>
);

export const PROJECT_PREVIEWS = {
  api: ApiPreview,
  agentTrace: AgentTracePreview,
  prd: PrdPreview,
  modelCard: ModelCardPreview,
  notebook: NotebookPreview,
  citedAnswer: CitedAnswerPreview,
  workflow: WorkflowPreview,
  dag: DagPreview,
  stream: StreamPreview,
  sql: SqlPreview,
  dashboard: DashboardPreview,
} satisfies Record<string, ReactNode>;

export type ProjectPreviewKey = keyof typeof PROJECT_PREVIEWS;

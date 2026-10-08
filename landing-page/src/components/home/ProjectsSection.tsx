import { Chip } from "@/components/core/Chip";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { Section } from "@/components/layout/Section";

function Key({ children }: { children: string }) {
  return <span className="text-(--teal-400)">{children}</span>;
}

const ApiPreview = (
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

const PipelinePreview = (
  <div className="py-(--space-6)">
    <div className="flex flex-wrap items-center gap-(--space-1)">
      {["extract", "validate", "load", "dbt run"].map((step) => (
        <span key={step} className="flex items-center gap-(--space-1)">
          <Chip variant="code">{step}</Chip>
          <span className="text-(--text-on-dark-muted)">→</span>
        </span>
      ))}
      <Chip variant="code-amber">test</Chip>
    </div>
    <div className="mt-(--space-3)">rows_loaded=1,284,512 · null_rate=0.02% · sla=met</div>
  </div>
);

const KPIS = [
  { label: "Auth rate", value: "94.1%" },
  { label: "Failed", value: "3.2%" },
  { label: "Drop-off", value: "12%" },
];
const BARS = [40, 60, 50, 77, 67, 90, 80, 97, 87, 100];

const DashboardPreview = (
  <div>
    <div className="grid grid-cols-3 gap-(--space-2)">
      {KPIS.map((k) => (
        <div key={k.label} className="rounded-(--radius-xs) border border-(--border-dark-strong) p-(--space-2)">
          <div>{k.label}</div>
          <div className="mt-(--space-1) text-(length:--fs-2xs) font-semibold leading-none text-(--text-on-dark)">
            {k.value}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-(--space-3) flex h-(--space-16) items-end gap-(--space-2)" aria-hidden>
      {BARS.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}%` }}
          className={`flex-1 rounded-(--radius-xs) ${i === BARS.length - 1 ? "bg-(--amber-500)" : "bg-(--teal-500)"}`}
        />
      ))}
    </div>
  </div>
);

const PROJECTS = [
  {
    track: "Forward Deployed AI Engineer",
    windowTitle: "POST /v1/score",
    preview: ApiPreview,
    title: "Merchant settlements API",
    description: "A production-style API that exposes daily merchant settlements with auth, pagination and audit logs.",
    dataset: "Synthetic merchant transactions and settlement batches",
    tags: ["OpenAPI spec", "Test suite", "Deployed endpoint"],
  },
  {
    track: "Data & AI Platform Engineer",
    windowTitle: "dags/transactions_daily.py",
    preview: PipelinePreview,
    title: "Fintech transaction pipeline",
    description: "Incremental ingestion of card transactions into a tested, documented warehouse.",
    dataset: "Card transactions, merchants and FX rates",
    tags: ["DAG", "dbt docs", "Quality report"],
  },
  {
    track: "Data Science, Analytics & Decision Intelligence",
    windowTitle: "Payments Conversion · Power BI",
    preview: DashboardPreview,
    title: "Payments conversion dashboard",
    description: "A dashboard tracking authorisation rates, failure reasons and conversion by method and bank.",
    dataset: "Checkout sessions and payment attempts",
    tags: ["Dashboard", "KPI dictionary", "Insight summary"],
  },
];

export function ProjectsSection() {
  return (
    <Section id="projects" tone="glow">
      <SectionHeader
        theme="dark"
        eyebrow="What you build"
        title="Projects that look like the job."
        lead="Pipelines, dashboards, models and agents built on realistic fintech data, then reviewed against a rubric."
      />
      <div className="mt-(--space-12) grid gap-(--space-5) lg:grid-cols-3">
        {PROJECTS.map(({ track, ...project }) => (
          <div key={project.title} className="flex min-w-0 flex-col gap-(--space-3)">
            <span className="text-(length:--fs-xs) font-medium leading-(--lh-snug) text-(--text-on-dark-body)">
              {track}
            </span>
            <ProjectCard {...project} />
          </div>
        ))}
      </div>
    </Section>
  );
}

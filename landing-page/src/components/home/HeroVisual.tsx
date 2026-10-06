import { CircleCheck, CircleDashed } from "lucide-react";
import { Chip } from "@/components/core/Chip";
import { CodeWindow } from "@/components/cards/CodeWindow";

const MILESTONES = [
  { label: "Lakehouse ingestion pipeline — reviewed", done: true },
  { label: "Data-quality suite — reviewed", done: true },
  { label: "Capstone — in progress", done: false },
];

const PIPELINE = ["extract", "validate", "load", "dbt run"];

const monoLabel =
  "font-(family-name:--font-mono) text-(length:--fs-label) uppercase leading-none tracking-(--ls-label)";

/** Hero artefact: a tilted learner-progress card with a capstone tag and a mentor note floating over it. */
export function HeroVisual() {
  return (
    <figure
      aria-label="Sample learner progress on the Data & AI Platform Engineer track"
      className="relative mx-auto w-full max-w-xl pt-(--space-8) pb-(--space-20) lg:mx-0"
    >
      <div className="rotate-1 rounded-(--radius-3xl) border border-(--border-dark) bg-(--surface-dark-raised) p-(--space-5) shadow-(--shadow-dark-float)">
        <div className="flex items-center justify-between gap-(--space-4) font-(family-name:--font-mono) text-(length:--fs-eyebrow) leading-none">
          <span className="text-(--text-on-dark-body)">Track · Data &amp; AI Platform Engineer</span>
          <span className="whitespace-nowrap text-(--text-on-dark-muted)">Week 9 of 16</span>
        </div>
        <div
          role="progressbar"
          aria-label="Track progress"
          aria-valuenow={9}
          aria-valuemin={0}
          aria-valuemax={16}
          className="mt-(--space-4) mb-(--space-5) h-(--space-1) rounded-(--radius-xs) bg-(--navy-600)"
        >
          <div className="h-full w-[56%] rounded-(--radius-xs) bg-(--teal-400)" />
        </div>

        <CodeWindow title="dags/transactions_daily.py">
          <div className="flex flex-wrap items-center gap-(--space-1) pt-(--space-4)">
            {PIPELINE.map((step) => (
              <span key={step} className="flex items-center gap-(--space-1)">
                <Chip variant="code">{step}</Chip>
                <span className="text-(--text-on-dark-muted)">→</span>
              </span>
            ))}
            <Chip variant="code-amber">test</Chip>
          </div>
          <div className="mt-(--space-3) pb-(--space-4)">rows_loaded=1,284,512 · null_rate=0.02% · sla=met</div>
        </CodeWindow>

        <ul className="mt-(--space-5) flex flex-col gap-(--space-3)">
          {MILESTONES.map(({ label, done }) => {
            const Icon = done ? CircleCheck : CircleDashed;
            return (
              <li
                key={label}
                className={`flex items-center gap-(--space-3) text-(length:--fs-xs) leading-(--lh-snug) ${done ? "text-(--text-on-dark)" : "text-(--text-on-dark-muted)"}`}
              >
                <Icon
                  size={15}
                  aria-hidden
                  className={`shrink-0 ${done ? "text-(--teal-400)" : "text-(--text-on-dark-muted)"}`}
                />
                {label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="absolute top-0 right-0 rounded-(--radius-xl) bg-(--amber-500) px-(--space-4) py-(--space-3) text-(--amber-950) shadow-(--shadow-dark-float) sm:-right-(--space-4)">
        <div className={monoLabel}>Capstone</div>
        <div className="mt-(--space-2) font-(family-name:--font-display) text-(length:--fs-body) font-semibold leading-none">
          Fintech · Payments
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-2xs max-w-[80%] -rotate-2 rounded-(--radius-xl) border border-(--border-dark-strong) bg-(--surface-dark-raised) px-(--space-4) py-(--space-4) shadow-(--shadow-dark-float) sm:-left-(--space-8)">
        <div className={`${monoLabel} text-(--text-on-dark-body)`}>Mentor review</div>
        <p className="mt-(--space-3) text-(length:--fs-xs) leading-(--lh-body) text-(--text-on-dark)">
          “Partitioning strategy is solid. Add a data-quality check before the load step.”
        </p>
      </div>
    </figure>
  );
}

import { Database } from "lucide-react";
import { Fragment } from "react";
import { Eyebrow } from "@/components/core/Eyebrow";
import type { CourseDetail } from "@/content/courses";

/** Dark rounded band: capstone brief, dataset, four engagement stages and the alternative-domain note. */
export function CapstonePanel({ capstone }: { capstone: CourseDetail["capstone"] }) {
  const domains = capstone.altDomains;
  return (
    <div className="bg-hero-grid overflow-hidden rounded-(--radius-3xl) px-(--space-6) py-(--space-10) sm:px-(--space-10)">
      <Eyebrow tone="promo" line={false}>
        Fintech-first capstone
      </Eyebrow>
      <h3 className="mt-(--space-5) max-w-3xl font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-on-dark) sm:text-(length:--fs-h3)">
        {capstone.title}
      </h3>
      <p className="mt-(--space-4) max-w-3xl text-(length:--fs-lead) leading-(--lh-lead) text-(--text-on-dark-body)">
        {capstone.body}
      </p>
      <p className="mt-(--space-5) flex items-start gap-(--space-2) text-(length:--fs-xs) leading-(--lh-snug) text-(--text-on-dark-body)">
        <Database size={16} aria-hidden className="mt-px shrink-0 text-(--text-on-dark-accent)" />
        <span>
          <b className="font-medium text-(--text-on-dark)">Dataset:</b> {capstone.dataset}
        </span>
      </p>
      <ol className="mt-(--space-10) grid gap-px overflow-hidden rounded-(--radius-3xl) border border-(--border-dark-strong) bg-(--border-dark-strong) sm:grid-cols-2 lg:grid-cols-4">
        {capstone.stages.map((s, i) => (
          <li
            key={s.title}
            className="flex flex-col bg-(--surface-dark-raised) px-(--space-5) pt-(--space-5) pb-(--space-6)"
          >
            <span className="font-(family-name:--font-mono) text-(length:--fs-label) leading-none text-(--text-on-dark-accent) tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mt-(--space-4) font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-on-dark)">
              {s.title}
            </span>
            <span className="mt-(--space-3) text-(length:--fs-xs) leading-(--lh-body) text-(--text-on-dark-body)">
              {s.body}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-(--space-8) text-(length:--fs-xs) leading-(--lh-body) text-(--text-on-dark-body)">
        Prefer another domain? Choose{" "}
        {domains.map((d, i) => (
          <Fragment key={d}>
            <span className="text-(--text-on-dark)">{d}</span>
            {i < domains.length - 2 ? ", " : i === domains.length - 2 ? " or " : ""}
          </Fragment>
        ))}{" "}
        at the capstone kick-off.
      </p>
    </div>
  );
}

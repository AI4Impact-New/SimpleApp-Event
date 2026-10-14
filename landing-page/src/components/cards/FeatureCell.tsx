import type { LucideIcon } from "lucide-react";

type FeatureCellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional index shown top-right, e.g. "01". */
  number?: string;
};

export function FeatureCell({ icon: Icon, title, description, number }: FeatureCellProps) {
  return (
    <div className="flex min-w-0 flex-col bg-(--surface-card) px-(--space-6) pt-(--space-6) pb-(--space-8)">
      <div className="flex items-start justify-between gap-(--space-3)">
        <Icon size={18} aria-hidden className="text-(--text-accent)" />
        {number ? (
          <span className="font-(family-name:--font-mono) text-(length:--fs-label) leading-none text-(--text-muted) tabular-nums">
            {number}
          </span>
        ) : null}
      </div>
      <span className="mt-(--space-5) font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
        {title}
      </span>
      <span className="mt-(--space-3) text-(length:--fs-2xs) leading-(--lh-body) text-pretty text-(--text-body)">
        {description}
      </span>
    </div>
  );
}

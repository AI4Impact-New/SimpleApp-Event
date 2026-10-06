import type { LucideIcon } from "lucide-react";

type FeatureCellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FeatureCell({ icon: Icon, title, description }: FeatureCellProps) {
  return (
    <div className="flex min-w-0 flex-col bg-(--surface-card) px-(--space-6) pt-(--space-6) pb-(--space-8)">
      <Icon size={18} aria-hidden className="text-(--text-strong)" />
      <span className="mt-(--space-5) font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
        {title}
      </span>
      <span className="mt-(--space-3) text-(length:--fs-2xs) leading-(--lh-body) text-pretty text-(--text-body)">
        {description}
      </span>
    </div>
  );
}

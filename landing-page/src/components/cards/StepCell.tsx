type StepCellProps = {
  number: string;
  title: string;
  subtitle: string;
  description: string;
};

export function StepCell({ number, title, subtitle, description }: StepCellProps) {
  return (
    <div className="flex min-w-0 flex-col bg-(--surface-card) px-(--space-6) pt-(--space-6) pb-(--space-8)">
      <span className="text-(length:--fs-2xs) leading-none text-(--text-muted) tabular-nums">{number}</span>
      <span className="mt-(--space-4) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-heading) tracking-(--ls-heading) text-(--text-strong)">
        {title}
      </span>
      <span className="mt-(--space-3) text-(length:--fs-xs) font-medium leading-(--lh-snug) text-(--text-strong)">
        {subtitle}
      </span>
      <span className="mt-(--space-2) text-(length:--fs-2xs) leading-(--lh-body) text-pretty text-(--text-body)">
        {description}
      </span>
    </div>
  );
}

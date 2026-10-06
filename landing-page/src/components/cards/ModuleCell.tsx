type ModuleCellProps = {
  number: string;
  title: string;
  description: string;
  note?: string;
  className?: string;
};

export function ModuleCell({ number, title, description, note, className = "" }: ModuleCellProps) {
  return (
    <div className={`flex min-w-0 flex-col bg-(--surface-card) px-(--space-6) pt-(--space-6) pb-(--space-8) ${className}`}>
      <span className="text-(length:--fs-2xs) leading-none text-(--text-muted) tabular-nums">{number}</span>
      <span className="mt-(--space-4) font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
        {title}
      </span>
      <span className="mt-(--space-2) text-(length:--fs-2xs) leading-(--lh-body) text-(--text-body)">
        {description}
      </span>
      {note ? (
        <span className="mt-(--space-2) text-(length:--fs-eyebrow) leading-(--lh-body) text-(--text-muted)">
          {note}
        </span>
      ) : null}
    </div>
  );
}

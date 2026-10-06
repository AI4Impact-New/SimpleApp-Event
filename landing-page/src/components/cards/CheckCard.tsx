import { Check } from "lucide-react";
import { Eyebrow } from "@/components/core/Eyebrow";

type CheckCardProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: string[];
  footer: string;
  highlighted?: boolean;
};

/** Checklist card. Highlighted variant = 2px teal border. */
export function CheckCard({ eyebrow, title, subtitle, items, footer, highlighted = false }: CheckCardProps) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-(--radius-3xl) bg-(--surface-card) px-(--space-6) pt-(--space-6) pb-(--space-5) ${highlighted ? "border-2 border-(--border-accent)" : "border border-(--border-default)"}`}
    >
      <Eyebrow tone="muted">{eyebrow}</Eyebrow>
      <h3 className="mt-(--space-3) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
        {title}
      </h3>
      <p className="mt-(--space-2) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">{subtitle}</p>
      <ul className="mt-(--space-4) flex flex-col gap-(--space-3)">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-(--space-3) text-(length:--fs-xs) leading-(--lh-snug) text-(--text-strong)"
          >
            <Check size={14} aria-hidden className="shrink-0" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-(--space-6) border-t border-(--border-default) pt-(--space-5) text-(length:--fs-2xs) font-medium leading-(--lh-snug) text-(--text-strong)">
        {footer}
      </p>
    </div>
  );
}

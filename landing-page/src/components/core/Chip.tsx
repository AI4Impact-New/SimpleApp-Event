import type { ReactNode } from "react";

type Variant = "outline" | "tag" | "code" | "code-amber";

const VARIANTS: Record<Variant, string> = {
  outline:
    "h-(--h-btn-sm) px-(--space-4) rounded-(--radius-pill) border border-(--border-default) bg-(--surface-card) text-(--text-strong) text-(length:--fs-xs)",
  tag: "h-(--space-6) px-(--space-2) rounded-(--radius-sm) bg-(--navy-600) text-(--text-on-dark) font-(family-name:--font-mono) text-(length:--fs-label)",
  code: "h-(--space-6) px-(--space-2) rounded-(--radius-xs) border border-(--teal-500) text-(--teal-400) font-(family-name:--font-mono) text-(length:--fs-label)",
  "code-amber":
    "h-(--space-6) px-(--space-2) rounded-(--radius-xs) border border-(--amber-500) text-(--amber-500) font-(family-name:--font-mono) text-(length:--fs-label)",
};

type ChipProps = {
  variant?: Variant;
  children: ReactNode;
};

/** Outline journey chip on light; tag / code chips inside dark mock artefacts. */
export function Chip({ variant = "outline", children }: ChipProps) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap leading-none ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}

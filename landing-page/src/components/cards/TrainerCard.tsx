import { ChevronRight } from "lucide-react";
import { Card } from "@/components/core/Card";

type TrainerCardProps = {
  name: string;
  initials: string;
  subtitle: string;
};

/** Trainer row: initials tile, name, one-line specialism. */
export function TrainerCard({ name, initials, subtitle }: TrainerCardProps) {
  return (
    <Card className="flex min-w-0 items-center gap-(--space-4) py-(--space-3) pr-(--space-4) pl-(--space-3)">
      <span className="flex size-(--space-10) shrink-0 items-center justify-center rounded-(--radius-lg) bg-(--slate-100) font-(family-name:--font-display) text-(length:--fs-2xs) font-semibold leading-none text-(--text-strong)">
        {initials}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-(--space-1)">
        <span className="font-(family-name:--font-display) text-(length:--fs-xs) font-semibold leading-(--lh-snug) text-(--text-strong)">
          {name}
        </span>
        <span className="truncate text-(length:--fs-2xs) leading-(--lh-snug) text-(--text-body)">{subtitle}</span>
      </span>
      <ChevronRight size={14} aria-hidden className="shrink-0 text-(--text-muted)" />
    </Card>
  );
}

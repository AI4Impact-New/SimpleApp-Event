import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/core/Card";

type TrainerCardProps = {
  name: string;
  initials: string;
  subtitle: string;
  /** `row` = compact home-page row with chevron; `feature` = large navy tile for course pages. */
  variant?: "row" | "feature";
  /** Profile page; when set the whole card is a link. */
  href?: string;
};

/** Trainer card: initials tile, name, one-line specialism. */
export function TrainerCard({ name, initials, subtitle, variant = "row", href }: TrainerCardProps) {
  const card = variant === "feature" ? (
    <Card interactive={!!href} className="flex min-w-0 items-center gap-(--space-5) p-(--space-6)">
      <span
        aria-hidden
        className="flex size-(--space-16) shrink-0 items-center justify-center rounded-(--radius-xl) bg-(--navy-800) font-(family-name:--font-display) text-(length:--fs-body) font-bold leading-none text-(--white)"
      >
        {initials}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-(--space-2)">
        <span className="font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
          {name}
        </span>
        <span className="text-(length:--fs-xs) leading-(--lh-snug) text-(--text-body)">{subtitle}</span>
      </span>
    </Card>
  ) : (
    <Card interactive={!!href} className="flex min-w-0 items-center gap-(--space-4) py-(--space-3) pr-(--space-4) pl-(--space-3)">
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
  return href ? (
    <Link href={href} className="block min-w-0 text-inherit no-underline hover:text-inherit hover:no-underline">
      {card}
    </Link>
  ) : (
    card
  );
}

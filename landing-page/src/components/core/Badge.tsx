import type { ReactNode } from "react";

type Tone = "neutral" | "promo" | "accent" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-(--slate-100) text-(--slate-700) border-(--border-default)",
  promo: "bg-(--amber-500) text-(--amber-950) border-(--amber-500)",
  accent: "bg-(--teal-100) text-(--teal-700) border-(--teal-100)",
  dark: "bg-(--navy-800) text-(--white) border-(--navy-800)",
};

type BadgeProps = {
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

/** Small pill label. At most one per card. */
export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-(--space-6) items-center whitespace-nowrap rounded-(--radius-pill) border px-(--space-2) text-(length:--fs-eyebrow) font-medium leading-none ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

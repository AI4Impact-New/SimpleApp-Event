import type { ReactNode } from "react";

type Tone = "accent" | "onDark" | "promo" | "muted";

const TONES: Record<Tone, { text: string; line: string }> = {
  accent: { text: "text-(--text-body)", line: "bg-(--text-body)" },
  onDark: { text: "text-(--text-on-dark-body)", line: "bg-(--text-on-dark-body)" },
  promo: { text: "text-(--text-on-dark-body)", line: "bg-(--text-on-dark-body)" },
  muted: { text: "text-(--text-muted)", line: "bg-(--text-muted)" },
};

type EyebrowProps = {
  tone?: Tone;
  line?: boolean;
  children: ReactNode;
  className?: string;
};

/** Quiet kicker above a heading. Sentence case, body font, neutral colour. */
export function Eyebrow({ tone = "accent", line = false, children, className = "" }: EyebrowProps) {
  const t = TONES[tone];
  return (
    <div
      className={`flex items-center gap-(--space-3) font-medium text-(length:--fs-xs) leading-(--lh-snug) ${t.text} ${className}`}
    >
      {line ? <span className={`h-px w-(--space-4) shrink-0 ${t.line}`} /> : null}
      <span>{children}</span>
    </div>
  );
}

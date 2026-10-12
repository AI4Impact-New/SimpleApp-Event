import type { ReactNode } from "react";

type Tone = "accent" | "onDark" | "promo" | "muted";
type Variant = "sentence" | "mono";

const TONES: Record<Tone, { text: string; line: string }> = {
  accent: { text: "text-(--text-body)", line: "bg-(--text-body)" },
  onDark: { text: "text-(--text-on-dark-body)", line: "bg-(--text-on-dark-body)" },
  promo: { text: "text-(--text-on-dark-body)", line: "bg-(--text-on-dark-body)" },
  muted: { text: "text-(--text-muted)", line: "bg-(--text-muted)" },
};

const MONO_TONES: Record<Tone, string> = {
  accent: "text-(--text-accent)",
  onDark: "text-(--text-on-dark-accent)",
  promo: "text-(--text-promo)",
  muted: "text-(--text-muted)",
};

type EyebrowProps = {
  tone?: Tone;
  /** `mono` (default) = uppercase JetBrains Mono with a teal 24px rule; `sentence` = quiet body-font kicker. */
  variant?: Variant;
  /** Leading rule. Defaults to off for `sentence`, on for `mono`. */
  line?: boolean;
  children: ReactNode;
  className?: string;
};

/** Kicker above a heading. Sentence variant: body font, neutral colour. Mono variant: uppercase, tracked, teal. */
export function Eyebrow({ tone = "accent", variant = "mono", line, children, className = "" }: EyebrowProps) {
  if (variant === "mono") {
    return (
      <div
        className={`flex items-center gap-(--space-3) font-(family-name:--font-mono) text-(length:--fs-eyebrow) uppercase leading-none tracking-(--ls-eyebrow) ${MONO_TONES[tone]} ${className}`}
      >
        {line !== false ? <span className="h-px w-(--space-6) shrink-0 bg-current" /> : null}
        <span>{children}</span>
      </div>
    );
  }
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

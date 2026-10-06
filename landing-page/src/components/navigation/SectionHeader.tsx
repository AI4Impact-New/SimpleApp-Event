import type { ReactNode } from "react";
import { Eyebrow } from "@/components/core/Eyebrow";

type SectionHeaderProps = {
  eyebrow?: string;
  eyebrowTone?: "accent" | "onDark" | "promo" | "muted";
  title: ReactNode;
  lead?: ReactNode;
  theme?: "light" | "dark";
  aside?: ReactNode;
};

export function SectionHeader({ eyebrow, eyebrowTone, title, lead, theme = "light", aside }: SectionHeaderProps) {
  const dark = theme === "dark";
  return (
    <div className="flex flex-col gap-(--space-6) md:flex-row md:items-end md:justify-between md:gap-(--space-8)">
      <div className="flex max-w-4xl flex-col">
        {eyebrow ? <Eyebrow tone={eyebrowTone ?? (dark ? "onDark" : "accent")}>{eyebrow}</Eyebrow> : null}
        <h2
          className={`font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-heading) tracking-(--ls-heading) md:text-(length:--fs-h2) ${eyebrow ? "mt-(--space-4)" : ""} ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
        >
          {title}
        </h2>
        {lead ? (
          <p
            className={`mt-(--space-4) max-w-2xl text-(length:--fs-lead) leading-(--lh-body) text-pretty ${dark ? "text-(--text-on-dark-body)" : "text-(--text-body)"}`}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

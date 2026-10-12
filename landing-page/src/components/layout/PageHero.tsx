import type { ReactNode } from "react";
import { Eyebrow } from "@/components/core/Eyebrow";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** `grid` adds the home hero's glow + blueprint grid; default is the flat navy band. */
  background?: "flat" | "grid";
};

/** Inner-page hero: navy band (flat by default, or the hero grid + glow), optional eyebrow, H1 and lead. */
export function PageHero({ eyebrow, title, lead, background = "flat" }: PageHeroProps) {
  return (
    <section className={background === "grid" ? "bg-hero-grid" : "bg-(--bg-hero)"}>
      <div className="mx-auto max-w-(--container) px-(--container-pad) py-(--space-20) lg:py-(--space-24)">
        {eyebrow ? <Eyebrow tone="onDark">{eyebrow}</Eyebrow> : null}
        <h1 className={`max-w-3xl font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-tight) tracking-(--ls-display) text-(--text-on-dark) sm:text-(length:--fs-h2) lg:text-(length:--fs-h1) ${eyebrow ? "mt-(--space-6)" : ""}`}>
          {title}
        </h1>
        {lead ? (
          <p className="mt-(--space-6) max-w-xl text-(length:--fs-lead) leading-(--lh-lead) text-(--text-on-dark-body)">
            {lead}
          </p>
        ) : null}
      </div>
    </section>
  );
}

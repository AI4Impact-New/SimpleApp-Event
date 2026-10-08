import type { ReactNode } from "react";

const TONES = {
  page: "bg-(--surface-page)",
  alt: "bg-(--surface-alt)",
  dark: "bg-(--bg-hero)",
  glow: "bg-hero-glow",
};

export type SectionTone = keyof typeof TONES;

type SectionProps = {
  id: string;
  tone?: SectionTone;
  /** `sm` = 96px vertical padding for stacked listing bands (DS `pad={96}`). */
  pad?: "md" | "sm";
  children: ReactNode;
};

/** Full-bleed band with the 1216px container and standard section padding. */
export function Section({ id, tone = "page", pad = "md", children }: SectionProps) {
  return (
    <section id={id} className={`py-(--space-20) ${pad === "sm" ? "lg:py-(--space-24)" : "lg:py-(--section-pad-y)"} ${TONES[tone]}`}>
      <div className="mx-auto max-w-(--container) px-(--container-pad)">{children}</div>
    </section>
  );
}

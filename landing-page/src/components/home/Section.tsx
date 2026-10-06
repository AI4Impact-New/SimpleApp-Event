import type { ReactNode } from "react";

const TONES = {
  page: "bg-(--surface-page)",
  alt: "bg-(--surface-alt)",
  dark: "bg-(--bg-hero)",
  glow: "bg-hero-glow",
};

type SectionProps = {
  id: string;
  tone?: keyof typeof TONES;
  children: ReactNode;
};

/** Full-bleed band with the 1216px container and standard section padding. */
export function Section({ id, tone = "page", children }: SectionProps) {
  return (
    <section id={id} className={`py-(--space-20) lg:py-(--section-pad-y) ${TONES[tone]}`}>
      <div className="mx-auto max-w-(--container) px-(--container-pad)">{children}</div>
    </section>
  );
}

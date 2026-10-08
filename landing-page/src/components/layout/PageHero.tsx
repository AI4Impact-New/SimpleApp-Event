import type { ReactNode } from "react";

type PageHeroProps = {
  title: ReactNode;
  lead?: ReactNode;
};

/** Inner-page hero: flat navy band (the grid + glow is reserved for the home hero), H1 and lead. */
export function PageHero({ title, lead }: PageHeroProps) {
  return (
    <section className="bg-(--bg-hero)">
      <div className="mx-auto max-w-(--container) px-(--container-pad) py-(--space-20) lg:py-(--space-24)">
        <h1 className="max-w-3xl font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-tight) tracking-(--ls-display) text-(--text-on-dark) sm:text-(length:--fs-h2) lg:text-(length:--fs-h1)">
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

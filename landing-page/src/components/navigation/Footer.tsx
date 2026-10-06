import { Logo } from "@/components/core/Logo";

export type FooterColumn = { title: string; links: { label: string; href: string }[] };

type FooterProps = {
  columns: FooterColumn[];
  tagline: string;
  note: string;
  legal: string;
  legalRight: string;
};

export function Footer({ columns, tagline, note, legal, legalRight }: FooterProps) {
  return (
    <footer className="bg-(--surface-dark)">
      <div className="mx-auto grid max-w-(--container) items-start gap-(--space-12) px-(--container-pad) pt-(--space-12) pb-(--space-10) sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="flex max-w-xs flex-col items-start gap-(--space-4)">
          <Logo variant="dark" />
          <p className="font-(family-name:--font-display) text-(length:--fs-h5) leading-(--lh-snug) text-(--text-on-dark)">
            {tagline}
          </p>
          <p className="text-(length:--fs-eyebrow) leading-(--lh-body) text-(--text-on-dark-muted)">{note}</p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-(--space-3)">
            <span className="mb-(--space-1) text-(length:--fs-xs) font-medium leading-none text-(--text-on-dark)">
              {c.title}
            </span>
            {c.links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-(length:--fs-xs) leading-(--lh-snug) text-(--text-on-dark-body) hover:text-(--text-on-dark)"
              >
                {l.label}
              </a>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-(--border-dark)">
        <div className="mx-auto flex max-w-(--container) flex-col gap-(--space-2) px-(--container-pad) pt-(--space-5) pb-(--space-6) text-(length:--fs-eyebrow) leading-(--lh-body) text-(--text-on-dark-muted) md:flex-row md:justify-between md:gap-(--space-6)">
          <span>{legal}</span>
          <span>{legalRight}</span>
        </div>
      </div>
    </footer>
  );
}

import type { PolicyLink, PolicySection } from "@/content/legal";

type PolicySidebarProps = {
  policies: PolicyLink[];
  activeHref: string;
  sections: PolicySection[];
};

const LABEL = "font-(family-name:--font-mono) text-(length:--fs-label) uppercase leading-none tracking-(--ls-eyebrow) text-(--text-muted)";

/** Sticky policy switcher plus an "On this page" index of the current policy's sections. */
export function PolicySidebar({ policies, activeHref, sections }: PolicySidebarProps) {
  return (
    <aside className="flex flex-col gap-(--space-8) lg:sticky lg:top-[calc(var(--h-nav)+var(--space-8))] lg:self-start">
      <nav aria-label="Policies" className="flex flex-col gap-(--space-3)">
        <span className={LABEL}>Policies</span>
        <ul className="flex flex-wrap gap-(--space-1) lg:flex-col">
          {policies.map((p) => {
            const active = p.href === activeHref;
            return (
              <li key={p.href}>
                <a
                  href={p.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-(--radius-md) px-(--space-3) py-(--space-2) text-(length:--fs-2xs) leading-(--lh-snug) hover:no-underline ${
                    active
                      ? "bg-(--action-primary) text-(--action-on-primary)"
                      : "text-(--text-body) hover:bg-(--surface-alt) hover:text-(--text-strong)"
                  }`}
                >
                  {p.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav aria-label="On this page" className="hidden flex-col gap-(--space-3) lg:flex">
        <span className={LABEL}>On this page</span>
        <ul className="flex flex-col gap-(--space-2) border-l border-(--border-default) pl-(--space-3)">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-(length:--fs-2xs) leading-(--lh-snug) text-(--text-body) hover:text-(--text-strong) hover:no-underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

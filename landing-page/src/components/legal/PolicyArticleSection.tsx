import type { PolicySection } from "@/content/legal";

type PolicyArticleSectionProps = PolicySection & { number: number };

/** One numbered clause of a policy: amber mono index, heading, then paragraphs and bullet lists. */
export function PolicyArticleSection({ id, title, blocks, number }: PolicyArticleSectionProps) {
  return (
    <section id={id} className="scroll-mt-(--space-8)">
      <h2 className="flex items-baseline gap-(--space-3) font-(family-name:--font-display) text-(length:--fs-h4) font-semibold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
        <span className="font-(family-name:--font-mono) text-(length:--fs-eyebrow) font-normal tracking-normal text-(--text-promo)">
          {String(number).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="mt-(--space-4) flex flex-col gap-(--space-4) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
        {blocks.map((b, i) =>
          typeof b === "string" ? (
            <p key={i}>{b}</p>
          ) : (
            <ul key={i} className="flex flex-col gap-(--space-3)">
              {b.list.map((item) => (
                <li key={item} className="flex gap-(--space-3)">
                  <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-(--action-promo)" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ),
        )}
      </div>
    </section>
  );
}

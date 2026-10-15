import { PageHero } from "@/components/layout/PageHero";
import { PolicyArticleSection } from "@/components/legal/PolicyArticleSection";
import { PolicyContact } from "@/components/legal/PolicyContact";
import { PolicySidebar } from "@/components/legal/PolicySidebar";
import { POLICY_LINKS, SUPPORT_EMAIL, type Policy } from "@/content/legal";

type PolicyPageProps = { policy: Policy; href: string };

/** Shared layout for every legal policy: hero, sticky policy sidebar, numbered clauses and a support callout. */
export function PolicyPage({ policy, href }: PolicyPageProps) {
  return (
    <>
      <PageHero
        background="grid"
        eyebrow="Legal"
        title={policy.title}
        lead={policy.lead}
        meta={`Last updated ${policy.lastUpdated}`}
      />
      <div className="bg-(--surface-page)">
        <div className="mx-auto grid max-w-(--container) gap-(--space-12) px-(--container-pad) py-(--space-16) lg:grid-cols-[220px_1fr] lg:gap-(--space-16) lg:py-(--space-20)">
          <PolicySidebar policies={POLICY_LINKS} activeHref={href} sections={policy.sections} />
          <article className="flex max-w-3xl flex-col gap-(--space-12)">
            {policy.sections.map((s, i) => (
              <PolicyArticleSection key={s.id} {...s} number={i + 1} />
            ))}
            <PolicyContact email={SUPPORT_EMAIL} />
          </article>
        </div>
      </div>
    </>
  );
}

import { BadgeCheck, Handshake, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { Chip } from "@/components/core/Chip";
import { HireRequestForm } from "@/components/hire/HireRequestForm";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { HIRE, TRACKS } from "@/content/site";

export const metadata: Metadata = {
  title: "Hire from us · AI4Impact",
  description:
    "Access job-ready graduates across AI engineering, data engineering, analytics, data science, generative AI and AI product management.",
};

const BENEFIT_ICONS = { verified: BadgeCheck, tested: ShieldCheck, shortlist: Users };

export default function HireFromUsPage() {
  return (
    <>
      <PageHero
        background="grid"
        eyebrow="For employers"
        title={
          <>
            Hire job-ready
            <br />
            data and AI talent.
          </>
        }
        lead="Access graduates across AI engineering, data engineering, analytics, data science, generative AI and AI product management."
      />

      <Section id="hire" pad="sm">
        <div className="grid items-start gap-(--space-12) lg:grid-cols-2 lg:gap-(--space-12)">
          <div>
            <ul className="flex flex-col gap-(--space-6)">
              {HIRE.benefits.map(({ icon, title, body }) => {
                const Icon = BENEFIT_ICONS[icon];
                return (
                  <li key={title} className="flex gap-(--space-4)">
                    <span
                      aria-hidden
                      className="flex size-(--space-12) shrink-0 items-center justify-center rounded-(--radius-xl) bg-(--surface-alt) text-(--text-strong)"
                    >
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3 className="font-(family-name:--font-display) text-(length:--fs-body) font-semibold leading-(--lh-snug) text-(--text-strong)">
                        {title}
                      </h3>
                      <p className="mt-(--space-1) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
                        {body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-(--space-10) font-(family-name:--font-display) text-(length:--fs-body) font-semibold leading-(--lh-snug) text-(--text-strong)">
              Roles we train for
            </h3>
            <ul className="mt-(--space-4) flex flex-wrap gap-(--space-2)">
              {TRACKS.map((t) => (
                <li key={t.id}>
                  <Chip>{t.title}</Chip>
                </li>
              ))}
            </ul>

            <div
              id="consultancies"
              className="mt-(--space-10) scroll-mt-(--space-24) rounded-(--radius-3xl) bg-(--bg-hero) p-(--space-6) lg:p-(--space-8)"
            >
              <h3 className="flex items-center gap-(--space-3) font-(family-name:--font-display) text-(length:--fs-h5) font-bold leading-(--lh-snug) text-(--text-on-dark)">
                <Handshake size={20} aria-hidden className="text-(--text-promo)" />
                {HIRE.consultancy.title}
              </h3>
              <p className="mt-(--space-4) text-(length:--fs-sm) leading-(--lh-body) text-(--text-on-dark-body)">
                {HIRE.consultancy.body}
              </p>
            </div>

            <p className="mt-(--space-10) border-l-2 border-(--amber-500) pl-(--space-4) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
              {HIRE.disclaimer}
            </p>
          </div>

          <HireRequestForm />
        </div>
      </Section>
    </>
  );
}

import { ArrowRight, Building2, GraduationCap, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Certificate } from "@/components/cards/Certificate";
import { CheckCard } from "@/components/cards/CheckCard";
import { Button } from "@/components/core/Button";
import { Card } from "@/components/core/Card";
import { Eyebrow } from "@/components/core/Eyebrow";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { CERT_ANATOMY, CERT_ISSUERS, CERT_TIERS, FOOTER_COPY, SCORE_WEIGHTS } from "@/content/site";

export const metadata: Metadata = {
  title: "Certification · AI4Impact",
  description:
    "AI4Impact professional certificates are awarded for assessed work, not attendance, and carry a credential ID any employer can verify.",
};

const ISSUER_ICONS = { shield: ShieldCheck, university: GraduationCap, employer: Building2 };

export default function CertificationPage() {
  return (
    <>
      <section className="bg-hero-grid">
        <div className="mx-auto grid max-w-(--container) items-center gap-(--space-12) px-(--container-pad) py-(--space-20) lg:grid-cols-[1.1fr_1fr] lg:py-(--space-24)">
          <div>
            <Eyebrow tone="onDark">
              Certification
            </Eyebrow>
            <h1 className="mt-(--space-6) font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-tight) tracking-(--ls-display) text-(--text-on-dark) sm:text-(length:--fs-h2) lg:text-(length:--fs-h1)">
              Earn proof of what
              <br />
              you can actually build.
            </h1>
            <p className="mt-(--space-6) max-w-xl text-(length:--fs-lead) leading-(--lh-lead) text-(--text-on-dark-body)">
              An AI4Impact professional certificate is awarded for assessed work, not attendance. Every certificate
              carries a credential ID that employers can check in seconds.
            </p>
            <div className="mt-(--space-8) flex flex-wrap gap-(--space-3)">
              <Button variant="light" icon={ArrowRight} href="#standards">
                Explore certification standards
              </Button>
              <Button variant="dark-ghost" href="#verify">
                Verify a certificate
              </Button>
            </div>
          </div>
          <div className="lg:rotate-1">
            <Certificate />
          </div>
        </div>
      </section>

      <Section id="issuer">
        <div className="grid items-start gap-(--space-12) lg:grid-cols-2">
          <SectionHeader
            eyebrow="Who issues it"
            title={
              <>
                Issued by IIAA, with
                <br />
                an academic partner.
              </>
            }
            lead="Professional certificates are issued by the AI4Impact Institute of Applied AI (IIAA), the assessment and standards body of AI4Impact, in academic collaboration with XYZ University."
          />
          <Card className="grid divide-y divide-(--border-default) sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {CERT_ISSUERS.map(({ icon, title, body }) => {
              const Icon = ISSUER_ICONS[icon];
              return (
                <div key={title} className="p-(--space-6)">
                  <Icon size={20} aria-hidden className="text-(--text-accent)" />
                  <h3 className="mt-(--space-4) font-(family-name:--font-display) text-(length:--fs-body) font-semibold leading-(--lh-snug) text-(--text-strong)">
                    {title}
                  </h3>
                  <p className="mt-(--space-3) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">{body}</p>
                </div>
              );
            })}
          </Card>
        </div>
        <p className="mt-(--space-10) max-w-3xl border-l-2 border-(--amber-500) pl-(--space-4) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
          {FOOTER_COPY.note}
        </p>
      </Section>

      <Section id="anatomy" tone="alt">
        <SectionHeader
          eyebrow="Certificate anatomy"
          title="Nine things on every certificate."
          lead="Each element is there so an employer can see what you did and confirm it is real."
        />
        <div className="mt-(--space-12) grid items-start gap-(--space-8) lg:grid-cols-[1.6fr_1fr]">
          <div className="lg:sticky lg:top-(--space-24)">
            <Certificate annotated />
          </div>
          <Card as="article" className="overflow-hidden">
            <ol className="divide-y divide-(--border-default)">
              {CERT_ANATOMY.map(({ title, body }, i) => (
                <li key={title} className="flex gap-(--space-4) px-(--space-5) py-(--space-5)">
                  <span
                    aria-hidden
                    className="flex size-(--space-6) shrink-0 items-center justify-center rounded-(--radius-pill) bg-(--amber-500) font-(family-name:--font-display) text-(length:--fs-label) font-bold leading-none text-(--amber-950)"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-(length:--fs-sm) font-semibold leading-(--lh-snug) text-(--text-strong)">
                      {title}
                    </h3>
                    <p className="mt-(--space-1) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </Section>

      <Section id="standards">
        <SectionHeader
          eyebrow="Certification standards"
          title={
            <>
              Completing a course is not the
              <br className="hidden md:block" /> same as earning the certificate.
            </>
          }
          lead="Everyone who finishes gets a record of completion. The professional certificate needs an assessed standard."
        />
        <div className="mt-(--space-12) grid gap-(--space-4) md:grid-cols-2">
          <CheckCard {...CERT_TIERS.completion} />
          <CheckCard highlighted {...CERT_TIERS.professional} />
        </div>
        <Card className="mt-(--space-6) grid items-center gap-(--space-8) p-(--space-6) lg:grid-cols-[1fr_1.1fr] lg:p-(--space-8)">
          <div>
            <h3 className="font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
              How your score is made
            </h3>
            <p className="mt-(--space-2) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
              You need 70% overall, and the capstone must pass on its own.
            </p>
          </div>
          <div>
            <div
              role="img"
              aria-label={SCORE_WEIGHTS.map((s) => `${s.label} ${s.weight}%`).join(", ")}
              className="flex h-(--space-3) overflow-hidden rounded-(--radius-pill)"
            >
              {SCORE_WEIGHTS.map((s) => (
                <span key={s.label} className={s.color} style={{ width: `${s.weight}%` }} />
              ))}
            </div>
            <dl className="mt-(--space-4) grid grid-cols-2 gap-x-(--space-4) gap-y-(--space-1) sm:grid-cols-4">
              {SCORE_WEIGHTS.map((s) => (
                <div key={s.label} className="row-span-2 grid grid-rows-subgrid gap-(--space-1)">
                  <dt className="flex items-start gap-(--space-2) text-(length:--fs-xs) leading-(--lh-snug) text-(--text-body)">
                    <span aria-hidden className={`mt-(--space-1) size-(--space-2) shrink-0 rounded-(--radius-pill) ${s.color}`} />
                    {s.label}
                  </dt>
                  <dd className="pl-(--space-4) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-none text-(--text-strong)">
                    {s.weight}%
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </Section>

      <Section id="verify" tone="glow">
        <SectionHeader
          theme="dark"
          eyebrow="Verification"
          title="Anyone can check it."
          lead="Employers scan the QR code or enter the credential ID to see the learner, track, capstone, result and issue date."
          aside={
            <Button variant="light" icon={ArrowRight} href="#">
              Verify a certificate
            </Button>
          }
        />
      </Section>
    </>
  );
}

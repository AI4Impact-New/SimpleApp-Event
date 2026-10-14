import { ArrowRight, Check, Info } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/core/Button";
import { Card } from "@/components/core/Card";
import { Chip } from "@/components/core/Chip";
import { Eyebrow } from "@/components/core/Eyebrow";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { GuidanceSection } from "@/components/sections/GuidanceSection";
import { PROGRAMME_PLUS } from "@/content/site";

export const metadata: Metadata = {
  title: "Programme+ · AI4Impact",
  description:
    "An optional bundle you can add to any track: internship, interview builder, recruitment support, weekly clarification and personal handholding.",
};

const { price, internationalPrice, journey, modules, notGuaranteed } = PROGRAMME_PLUS;

export default function ProgrammePlusPage() {
  return (
    <>
      <section className="bg-hero-grid">
        <div className="mx-auto grid max-w-(--container) items-center gap-(--space-12) px-(--container-pad) py-(--space-20) lg:grid-cols-[1.3fr_1fr] lg:py-(--space-24)">
          <div>
            <Eyebrow tone="onDark">Programme+</Eyebrow>
            <h1 className="mt-(--space-6) font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-tight) tracking-(--ls-display) text-(--text-on-dark) sm:text-(length:--fs-h2) lg:text-(length:--fs-h1)">
              Everything between
              <br />
              a finished capstone
              <br />
              and a real interview.
            </h1>
            <p className="mt-(--space-6) max-w-2xl text-(length:--fs-lead) leading-(--lh-lead) text-(--text-on-dark-body)">
              An optional bundle you can add to any track. Five modules, one price.
            </p>
            <ol
              aria-label="Programme+ journey"
              className="mt-(--space-8) flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-3)"
            >
              {journey.map((step, i) => (
                <li key={step} className="flex items-center gap-(--space-2)">
                  <Chip variant="dark">{step}</Chip>
                  {i < journey.length - 1 ? (
                    <ArrowRight size={14} aria-hidden className="text-(--text-on-dark-body)" />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          <Card theme="dark" className="p-(--space-6) shadow-(--shadow-dark-float) lg:p-(--space-8)">
            <Eyebrow tone="muted" line={false}>
              Programme+ bundle
            </Eyebrow>
            <p className="mt-(--space-4) font-(family-name:--font-display) text-(length:--fs-h2) font-bold leading-none tracking-(--ls-heading) text-(--text-on-dark)">
              {price}
            </p>
            <p className="mt-(--space-4) text-(length:--fs-xs) leading-(--lh-body) text-(--text-on-dark-body)">
              {internationalPrice} for international learners · added at enrolment
            </p>
            <Button variant="light" fullWidth icon={ArrowRight} href="/courses" className="mt-(--space-6)">
              Choose a track to add it to
            </Button>
          </Card>
        </div>
      </section>

      <Section id="modules">
        <SectionHeader eyebrow="What is included" title="Five modules." />
        <ol className="mt-(--space-10) flex flex-col gap-(--space-4)">
          {modules.map((m) => (
            <li key={m.number}>
              <Card
                as="article"
                className="grid gap-(--space-6) p-(--space-6) md:grid-cols-[auto_1fr_1fr] md:gap-(--space-8) lg:p-(--space-8)"
              >
                <span className="font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-none tabular-nums text-(--text-accent) md:text-(length:--fs-h2)">
                  {m.number}
                </span>
                <div>
                  <h3 className="font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
                    {m.title}
                  </h3>
                  <p className="mt-(--space-2) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
                    {m.description}
                  </p>
                  {m.note ? (
                    <p className="mt-(--space-4) text-(length:--fs-2xs) font-medium leading-(--lh-snug) text-(--text-strong)">
                      {m.note}
                    </p>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-(--space-3)">
                  {m.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-(--space-3) text-(length:--fs-xs) leading-(--lh-snug) text-(--text-strong)"
                    >
                      <Check size={14} aria-hidden className="mt-(--space-1) shrink-0 text-(--text-accent)" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ol>

        <Card className="mt-(--space-8) p-(--space-5)">
          <h3 className="flex items-center gap-(--space-2) text-(length:--fs-xs) font-semibold leading-(--lh-snug) text-(--text-strong)">
            <Info size={14} aria-hidden />
            What Programme+ does not guarantee
          </h3>
          <ul className="mt-(--space-3) flex list-disc flex-col gap-(--space-1) pl-(--space-8) text-(length:--fs-2xs) leading-(--lh-body) text-(--text-body)">
            {notGuaranteed.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
      </Section>

      <GuidanceSection
        title={
          <>
            Want to know if
            <br />
            Programme+ is
            <br />
            worth it for you?
          </>
        }
      />
    </>
  );
}

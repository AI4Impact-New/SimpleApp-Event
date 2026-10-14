import { ClipboardCheck, FlaskConical, type LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/core/Eyebrow";
import { Accordion } from "@/components/data/Accordion";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import type { CourseDetail, CoursePhase } from "@/content/courses";

/** Three-segment bar: weeks already covered (pale), this phase (teal), the rest (track). */
function PhaseProgress({ weeks: [from, to], total }: { weeks: CoursePhase["weeks"]; total: number }) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div aria-hidden className="flex h-(--space-1) overflow-hidden rounded-(--radius-pill) bg-(--slate-150)">
      <span className="bg-(--teal-100)" style={{ width: pct(from - 1) }} />
      <span className="rounded-(--radius-pill) bg-(--teal-600)" style={{ width: pct(to - from + 1) }} />
    </div>
  );
}

function WeekNumber({ n }: { n: number }) {
  return (
    <span className="flex size-(--space-10) shrink-0 items-center justify-center rounded-(--radius-pill) border border-(--border-default) font-(family-name:--font-mono) text-(length:--fs-2xs) leading-none text-(--text-strong) tabular-nums">
      {String(n).padStart(2, "0")}
    </span>
  );
}

/** Tinted panel inside an open week: teal icon + mono label, text aligned under the label. */
function WeekDetail({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: string }) {
  return (
    <div className="rounded-(--radius-3xl) bg-(--slate-100) p-(--space-6)">
      <div className="flex items-center gap-(--space-4)">
        <Icon size={18} aria-hidden className="shrink-0 text-(--text-accent)" />
        <span className="font-(family-name:--font-mono) text-(length:--fs-eyebrow) uppercase leading-none tracking-(--ls-label) text-(--text-body)">
          {label}
        </span>
      </div>
      <p className="mt-(--space-4) pl-[calc(18px+var(--space-4))] text-(length:--fs-sm) leading-(--lh-body) text-(--text-strong)">
        {children}
      </p>
    </div>
  );
}

export function CurriculumSection({ course }: { course: CourseDetail }) {
  return (
    <Section id="curriculum" tone="alt">
      <SectionHeader
        eyebrow="Curriculum"
        title="Week by week."
        lead="Every week has a hands-on lab and an assignment. Open a week to see both."
      />
      <div className="mt-(--space-12) flex flex-col gap-(--space-10)">
        {course.phases.map((phase, p) => (
          <div key={phase.title} className="grid gap-(--space-6) lg:grid-cols-[1fr_3.2fr] lg:gap-(--space-8)">
            <div className="flex flex-col">
              <Eyebrow line={false}>Phase {p + 1}</Eyebrow>
              <h3 className="mt-(--space-3) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
                {phase.title}
              </h3>
              <p className="mt-(--space-3) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
                {phase.summary}
              </p>
              <div className="mt-(--space-5) max-w-xs">
                <PhaseProgress weeks={phase.weeks} total={course.coreWeeks} />
              </div>
              <span className="mt-(--space-3) font-(family-name:--font-mono) text-(length:--fs-label) leading-none text-(--text-body)">
                Weeks {phase.weeks[0]}–{phase.weeks[1]} of {course.coreWeeks}
              </span>
            </div>
            <Accordion
              items={phase.items.map((week, i) => ({
                leading: <WeekNumber n={phase.weeks[0] + i} />,
                title: week.title,
                subtitle: week.topics.join(" · "),
                content: (
                  <div className="grid gap-(--space-4) sm:ml-[calc(var(--space-10)+var(--space-4))] sm:grid-cols-2">
                    <WeekDetail icon={FlaskConical} label="Lab">
                      {week.lab}
                    </WeekDetail>
                    <WeekDetail icon={ClipboardCheck} label="Weekly assignment">
                      {week.assignment}
                    </WeekDetail>
                  </div>
                ),
              }))}
            />
          </div>
        ))}
        <div className="grid lg:grid-cols-[1fr_3.2fr] lg:gap-(--space-8)">
          <p className="max-w-3xl text-(length:--fs-xs) leading-(--lh-body) text-(--text-body) lg:col-start-2">
            {course.paceNote}
          </p>
        </div>
      </div>
    </Section>
  );
}

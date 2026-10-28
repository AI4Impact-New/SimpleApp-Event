import { ArrowRight, Check, Minus, X } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Certificate } from "@/components/cards/Certificate";
import { CellGrid } from "@/components/cards/CellGrid";
import { FeatureCell } from "@/components/cards/FeatureCell";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { PROJECT_PREVIEWS } from "@/components/cards/ProjectPreviews";
import { TrainerCard } from "@/components/cards/TrainerCard";
import { Button } from "@/components/core/Button";
import { Card } from "@/components/core/Card";
import { Chip } from "@/components/core/Chip";
import { Eyebrow } from "@/components/core/Eyebrow";
import { CapstonePanel } from "@/components/course/CapstonePanel";
import { CourseHero } from "@/components/course/CourseHero";
import { CourseStickyBar } from "@/components/course/CourseStickyBar";
import { CurriculumSection } from "@/components/course/CurriculumSection";
import { Accordion } from "@/components/data/Accordion";
import { LEARNING_FEATURES } from "@/components/home/HowSection";
import { ProgrammeSection } from "@/components/home/ProgrammeSection";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { GuidanceSection } from "@/components/sections/GuidanceSection";
import { COURSE_DETAILS, getCourseTrainers } from "@/content/courses";
import { TRACKS } from "@/content/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(COURSE_DETAILS).map((slug) => ({ slug }));
}

function getCourse(slug: string) {
  const course = COURSE_DETAILS[slug];
  const track = course && TRACKS.find((t) => t.id === course.trackId);
  return course && track ? { course, track } : null;
}

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const found = getCourse((await params).slug);
  if (!found) return {};
  return { title: `${found.track.title} · AI4Impact`, description: found.track.description };
}

const LIST_ICONS = {
  check: { Icon: Check, className: "text-(--text-accent)" },
  dash: { Icon: Minus, className: "text-(--text-body)" },
  cross: { Icon: X, className: "text-(--text-body)" },
};

function IconList({ items, icon, muted = false }: { items: string[]; icon: keyof typeof LIST_ICONS; muted?: boolean }) {
  const { Icon, className } = LIST_ICONS[icon];
  return (
    <ul className="flex flex-col gap-(--space-3)">
      {items.map((item) => (
        <li
          key={item}
          className={`flex items-start gap-(--space-3) text-(length:--fs-sm) leading-(--lh-body) ${muted ? "text-(--text-body)" : "text-(--text-strong)"}`}
        >
          <Icon size={16} aria-hidden className={`mt-[0.35em] shrink-0 ${className}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

const PREREQ_COLUMNS = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3" } as const;

function ColumnLabel({ children }: { children: string }) {
  return (
    <Eyebrow tone="muted" line={false} className="mb-(--space-5)">
      {children}
    </Eyebrow>
  );
}

export default async function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  const found = getCourse((await params).slug);
  if (!found) notFound();
  const { course, track } = found;

  const trainers = getCourseTrainers(course);
  const prereqColumns = (1 +
    Number(Boolean(course.prerequisites.helpful?.length)) +
    Number(Boolean(course.prerequisites.notRequired?.length))) as keyof typeof PREREQ_COLUMNS;

  return (
    <>
      <CourseHero track={track} course={course} />

      <Section id="problem">
        <div className="grid items-center gap-(--space-12) lg:grid-cols-[1.1fr_1fr] lg:gap-(--space-16)">
          <SectionHeader eyebrow="The role problem" title={course.problem.title} lead={course.problem.body} />
          <Card className="divide-y divide-(--border-default)">
            {course.problem.points.map((point, i) => (
              <div key={point} className="flex items-center gap-(--space-4) px-(--space-6) py-(--space-5)">
                <span className="font-(family-name:--font-mono) text-(length:--fs-label) leading-none text-(--text-muted) tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-(length:--fs-sm) font-medium leading-(--lh-snug) text-(--text-strong)">
                  {point}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </Section>

      <Section id="outcomes" tone="alt">
        <SectionHeader eyebrow="Measurable outcomes" title="What you will be able to show." />
        <CellGrid columns="md:grid-cols-3" className="mt-(--space-10)">
          {course.outcomes.map((o) => (
            <div key={o.label} className="flex flex-col gap-(--space-4) bg-(--surface-card) p-(--space-8)">
              <span className="font-(family-name:--font-display) text-(length:--fs-h2) font-bold leading-none tracking-(--ls-heading) text-(--text-accent)">
                {o.value}
              </span>
              <span className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">{o.label}</span>
            </div>
          ))}
        </CellGrid>
        <div className="mt-(--space-6) grid gap-(--space-5) md:grid-cols-2">
          <Card className="p-(--space-8)">
            <h3 className="mb-(--space-5) font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
              This track is built for
            </h3>
            <IconList items={course.builtFor} icon="check" />
          </Card>
          <div className="rounded-(--radius-3xl) border border-dashed border-(--border-strong) p-(--space-8)">
            <h3 className="mb-(--space-5) font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
              Probably not the right fit if you are
            </h3>
            <IconList items={course.notFor} icon="cross" muted />
          </div>
        </div>
      </Section>

      <Section id="prerequisites">
        <SectionHeader eyebrow="Prerequisites" title="What you need before day one." />
        <CellGrid columns={PREREQ_COLUMNS[prereqColumns]} className="mt-(--space-10)">
          <div className="bg-(--surface-card) p-(--space-6)">
            <ColumnLabel>Required</ColumnLabel>
            <IconList items={course.prerequisites.required} icon="check" />
          </div>
          {course.prerequisites.helpful?.length ? (
            <div className="bg-(--surface-card) p-(--space-6)">
              <ColumnLabel>Helpful</ColumnLabel>
              <IconList items={course.prerequisites.helpful} icon="dash" />
            </div>
          ) : null}
          {course.prerequisites.notRequired?.length ? (
            <div className="bg-(--surface-card) p-(--space-6)">
              <ColumnLabel>Not required</ColumnLabel>
              <IconList items={course.prerequisites.notRequired} icon="cross" />
            </div>
          ) : null}
        </CellGrid>
        <ul aria-label="Tools you will use" className="mt-(--space-6) flex flex-wrap gap-(--space-2)">
          {course.tools.map((tool) => (
            <li key={tool}>
              <Chip variant="mono">{tool}</Chip>
            </li>
          ))}
        </ul>
      </Section>

      <CurriculumSection course={course} />

      <Section id="how">
        <SectionHeader
          eyebrow="How you learn"
          title={
            <>
              {course.delivery?.title[0] ?? "Recorded lessons."}
              <br />
              {course.delivery?.title[1] ?? "Live help every week."}
            </>
          }
        />
        <CellGrid columns="sm:grid-cols-2 lg:grid-cols-4" className="mt-(--space-10)">
          {(course.delivery?.features ?? LEARNING_FEATURES).map((f, i) => (
            <FeatureCell key={f.title} number={String(i + 1).padStart(2, "0")} {...f} />
          ))}
        </CellGrid>
        <p className="mt-(--space-5) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
          {course.delivery?.note ?? (
            <>
              Plan for <b className="font-semibold text-(--text-strong)">{track.weekly}/week</b>, including the live
              session.
            </>
          )}
        </p>
      </Section>

      <Section id="projects" tone="alt">
        <SectionHeader eyebrow="Projects" title="What goes in your portfolio." />
        {course.projects.length ? (
          <div className="mt-(--space-10) grid gap-(--space-5) lg:grid-cols-3">
            {course.projects.map(({ preview, ...project }) => (
              <ProjectCard key={project.title} theme="light" subgrid preview={PROJECT_PREVIEWS[preview]} {...project} />
            ))}
          </div>
        ) : null}
        <div className="mt-(--space-10)">
          <CapstonePanel capstone={course.capstone} />
        </div>
      </Section>

      {trainers.length ? (
        <Section id="trainers">
          <SectionHeader eyebrow="Trainers" title="Who teaches this track." />
          <div className="mt-(--space-10) grid gap-(--space-4) md:grid-cols-2">
            {trainers.map(({ trainer: t, label }) => (
              <TrainerCard
                key={t.slug}
                variant="feature"
                name={t.name}
                initials={t.initials}
                subtitle={`${label} · ${t.subtitle}`}
                href={`/trainers/${t.slug}`}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section id="roles" tone="alt">
        <SectionHeader eyebrow="Career outcomes" title="Roles this track prepares you for." />
        <div className="mt-(--space-10) grid gap-(--space-8) md:grid-cols-3 md:gap-(--space-5)">
          {course.roles.map((r) => (
            <div key={r.title} className="border-t-2 border-(--border-accent) pt-(--space-6)">
              <h3 className="font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
                {r.title}
              </h3>
              <p className="mt-(--space-3) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">{r.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-(--space-10) max-w-3xl text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
          These are the roles this track prepares you for. AI4Impact provides career support; it does not guarantee
          employment, interviews or a particular salary.
        </p>
      </Section>

      <Section id="certification">
        <div className="grid items-center gap-(--space-12) lg:grid-cols-[1fr_1.05fr] lg:gap-(--space-16)">
          <div>
            <SectionHeader
              title={
                <>
                  Finish the course.
                  <br />
                  Then earn the certificate.
                </>
              }
              lead="Completion records that you did the work. The professional certificate is awarded only after an independently reviewed capstone and a recorded defence, so it means something to the people hiring."
            />
            <div className="mt-(--space-8)">
              <Button variant="outline" size="sm" icon={ArrowRight} href="/certification#standards">
                Explore certification standards
              </Button>
            </div>
          </div>
          <Certificate
            programme={track.title}
            capstone={course.certificate.capstone}
            credentialId={course.certificate.credentialId}
          />
        </div>
      </Section>

      <ProgrammeSection />

      <Section id="faq">
        <div className="grid items-start gap-(--space-12) lg:grid-cols-[1fr_1.4fr] lg:gap-(--space-16)">
          <SectionHeader
            eyebrow="FAQ"
            title={
              <>
                Questions about
                <br />
                this track.
              </>
            }
          />
          <Accordion
            items={course.faqs.map((f) => ({
              title: f.question,
              content: <p className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">{f.answer}</p>,
            }))}
          />
        </div>
      </Section>

      <GuidanceSection />

      <CourseStickyBar title={track.title} fee={track.fee} nextCohort={course.pricing.nextCohort} />
    </>
  );
}

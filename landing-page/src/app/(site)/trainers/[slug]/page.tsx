import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackCard } from "@/components/cards/TrackCard";
import { TrainerAvatar } from "@/components/cards/TrainerAvatar";
import { trackMeta } from "@/components/cards/TrackGrid";
import { Badge } from "@/components/core/Badge";
import { Card } from "@/components/core/Card";
import { Chip } from "@/components/core/Chip";
import { Section } from "@/components/layout/Section";
import { getTrainerCourses } from "@/content/courses";
import { TRAINERS } from "@/content/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRAINERS.map((t) => ({ slug: t.slug }));
}

function getTrainer(slug: string) {
  const trainer = TRAINERS.find((t) => t.slug === slug);
  return trainer ? { trainer, courses: getTrainerCourses(trainer) } : null;
}

export async function generateMetadata({ params }: PageProps<"/trainers/[slug]">): Promise<Metadata> {
  const found = getTrainer((await params).slug);
  if (!found) return {};
  return { title: `${found.trainer.name} · AI4Impact`, description: found.trainer.subtitle };
}

export default async function TrainerPage({ params }: PageProps<"/trainers/[slug]">) {
  const found = getTrainer((await params).slug);
  if (!found) notFound();
  const { trainer, courses } = found;
  const firstName = trainer.name.split(" ")[0];

  return (
    <>
      <section className="bg-(--bg-hero)">
        <div className="mx-auto max-w-(--container) px-(--container-pad) py-(--space-20) lg:py-(--space-24)">
          <nav aria-label="Breadcrumb" className="text-(length:--fs-sm) leading-none text-(--text-on-dark-body)">
            <Link href="/trainers" className="text-(--text-on-dark-body) hover:text-(--text-on-dark)">
              Trainers
            </Link>
            <span aria-hidden> / </span>
            <span aria-current="page">{trainer.name}</span>
          </nav>
          <div className="mt-(--space-8) flex flex-wrap items-center gap-(--space-6)">
            <TrainerAvatar
              initials={trainer.initials}
              photo={trainer.photo}
              alt={trainer.photo?.alt}
              width={160}
              height={176}
              className={`rounded-(--radius-xl) border-2 border-(--border-dark-strong) ${trainer.photo ? "h-[11rem] w-[10rem]" : "size-(--space-24) text-(length:--fs-h3) text-(--text-on-dark)"}`}
            />
            <div className="flex min-w-0 flex-col items-start gap-(--space-3)">
              <h1 className="font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-tight) tracking-(--ls-display) text-(--text-on-dark) sm:text-(length:--fs-h2)">
                {trainer.name}
              </h1>
              {trainer.role ? (
                <p className="text-(length:--fs-sm) leading-(--lh-snug) text-(--text-on-dark-body)">{trainer.role}</p>
              ) : null}
              {trainer.company ? (
                <p className="text-(length:--fs-sm) font-semibold leading-(--lh-snug) text-(--text-on-dark-accent)">{trainer.company}</p>
              ) : null}
              {trainer.intro ? (
                <p className="max-w-xl text-(length:--fs-body) leading-(--lh-body) text-(--text-on-dark-body)">{trainer.intro}</p>
              ) : null}
              <ul aria-label="Teaches" className="flex flex-wrap gap-(--space-2)">
                {courses.map((c) => (
                  <li key={c.code}>
                    <Badge tone="promo" className="whitespace-normal">
                      {c.label} · {c.track.title}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Section id="about">
        <div className="grid items-start gap-(--space-10) lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
              {trainer.bio?.title ?? "About"}
            </h2>
            {(trainer.bio?.paragraphs ?? [trainer.subtitle]).map((p) => (
              <p key={p} className="mt-(--space-5) max-w-2xl text-(length:--fs-body) leading-(--lh-body) text-(--text-body)">
                {p}
              </p>
            ))}
            {trainer.approach ? (
              <div className="mt-(--space-8) max-w-2xl rounded-(--radius-xl) border-l-2 border-(--teal-500) bg-(--surface-alt) p-(--space-5)">
                <h3 className="text-(length:--fs-sm) font-semibold leading-(--lh-snug) text-(--text-strong)">
                  {firstName}&apos;s approach to learning
                </h3>
                <p className="mt-(--space-2) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">{trainer.approach}</p>
              </div>
            ) : null}
          </div>
          <Card className="p-(--space-6)">
            <h3 className="flex items-center gap-(--space-3) font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
              <MessagesSquare size={20} aria-hidden className="shrink-0 text-(--text-accent)" />
              Weekly clarification topics
            </h3>
            <p className="mt-(--space-3) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
              Bring your questions on these to {firstName}&apos;s live session every week.
            </p>
            <ul className="mt-(--space-5) flex flex-wrap gap-(--space-2)">
              {trainer.topics.map((t) => (
                <li key={t}>
                  <Chip variant="tag-light">{t}</Chip>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {trainer.expertise?.length ? (
          <>
            <h2 className="mt-(--space-20) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
              What {firstName} brings to the classroom
            </h2>
            <ul className="mt-(--space-8) grid gap-(--space-4) sm:grid-cols-2 lg:grid-cols-3">
              {trainer.expertise.map(({ title, body }) => (
                <li key={title}>
                  <Card className="h-full p-(--space-5)">
                    <h3 className="text-(length:--fs-sm) font-semibold leading-(--lh-snug) text-(--text-strong)">{title}</h3>
                    <p className="mt-(--space-1) text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">{body}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {trainer.credentials?.length ? (
          <>
            <h2 className="mt-(--space-20) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
              Credentials
            </h2>
            <ul aria-label="Professional certifications" className="mt-(--space-6) flex flex-wrap gap-(--space-2)">
              {trainer.credentials.map((c) => (
                <li key={c}>
                  <Chip>{c}</Chip>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {courses.length ? (
          <>
            <h2 className="mt-(--space-20) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
              Courses
            </h2>
            <div className="mt-(--space-8) grid gap-(--space-4) sm:grid-cols-2 lg:grid-cols-3">
              {courses.map(({ code, track: t }) => (
                <TrackCard
                  key={code}
                  number={code}
                  family={t.family}
                  title={t.title}
                  description={t.description}
                  meta={trackMeta(t)}
                  exploreHref={t.href ?? "/courses"}
                  enrolHref={t.href ? `${t.href}#guidance` : "#guidance"}
                  prerequisitesHref={t.href ? `${t.href}#prerequisites` : "/courses"}
                  programmeHref="/programme-plus"
                />
              ))}
            </div>
          </>
        ) : null}
      </Section>
    </>
  );
}

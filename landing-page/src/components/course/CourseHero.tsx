import {LivePrice} from "./LivePrice";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/core/Button";
import { Card } from "@/components/core/Card";
import { MetaGrid } from "@/components/data/MetaGrid";
import type { CourseDetail } from "@/content/courses";
import { getTrackAction, type Track } from "@/content/site";

type CourseHeroProps = { track: Track; course: CourseDetail };

/** Course hero: breadcrumb, H1, enrol CTAs and a dark facts card with price and next cohort. */
export function CourseHero({ track, course }: CourseHeroProps) {
  const action = getTrackAction(track);
  return (
    <section className="bg-hero-grid">
      <div className="mx-auto grid max-w-(--container) items-center gap-(--space-12) px-(--container-pad) py-(--space-20) lg:grid-cols-[1.5fr_1fr] lg:py-(--space-24)">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="font-(family-name:--font-mono) text-(length:--fs-2xs) leading-none text-(--text-on-dark-body)"
          >
            <Link href="/courses" className="text-(--text-on-dark-body) hover:text-(--text-on-dark)">
              Career tracks
            </Link>
            <span aria-hidden> / </span>
            <span aria-current="page" className="text-(--text-on-dark-accent)">
              {track.title}
            </span>
          </nav>
          <h1 className="mt-(--space-6) max-w-3xl font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-tight) tracking-(--ls-display) text-balance text-(--text-on-dark) sm:text-(length:--fs-h2) lg:text-(length:--fs-h1)">
            {course.hero.title}
          </h1>
          <p className="mt-(--space-6) max-w-2xl text-(length:--fs-lead) leading-(--lh-lead) text-(--text-on-dark-body)">
            {course.hero.lead}
          </p>
          <div className="mt-(--space-8) flex flex-wrap gap-(--space-3)">
            <Button variant="light" size="lg" icon={ArrowRight} href={action.href} className="whitespace-normal">
              {action.label}
            </Button>
            <Button variant="dark-ghost" size="lg" href="#curriculum">
              View curriculum
            </Button>
          </div>
        </div>

        <Card theme="dark" className="p-(--space-6)">
          <MetaGrid
            theme="dark"
            items={[
              { label: "Level", value: track.level },
              { label: "Duration", value: track.duration },
              { label: "Weekly effort", value: `${track.weekly}/week` },
              { label: "Projects", value: track.projects },
            ]}
          />
          <div className="mt-(--space-6) flex flex-wrap items-end justify-between gap-(--space-4) border-t border-(--border-dark-strong) pt-(--space-6)">
            <div className="flex flex-col gap-(--space-1)">
              <span className="font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-none tracking-(--ls-heading) text-(--text-on-dark)">
                <LivePrice slug={track.href?.split("/").pop()||""} initial={track.fee}/>
              </span>
              <span className="text-(length:--fs-xs) leading-(--lh-snug) text-(--text-on-dark-body)">
                {[course.pricing.instalments, course.pricing.international].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="flex flex-col gap-(--space-1) text-right">
              <span className="text-(length:--fs-xs) leading-(--lh-snug) text-(--text-on-dark-body)">Next cohort</span>
              <span className="text-(length:--fs-xs) font-medium leading-(--lh-snug) text-(--text-on-dark)">
                {course.pricing.nextCohort}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

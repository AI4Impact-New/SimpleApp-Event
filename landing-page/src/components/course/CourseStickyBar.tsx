import {LivePrice} from "./LivePrice";
import {TRACKS} from "@/content/site";
import { Button } from "@/components/core/Button";

type CourseStickyBarProps = { title: string; fee: string; nextCohort: string };

/** Enrol bar pinned to the viewport bottom while the course page scrolls; rests above the footer. */
export function CourseStickyBar({ title, fee, nextCohort }: CourseStickyBarProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-(--border-default) bg-(--slate-100)/90 backdrop-blur">
      <div className="mx-auto flex max-w-(--container) items-center justify-between gap-(--space-4) px-(--container-pad) py-(--space-3)">
        <div className="flex min-w-0 flex-col gap-(--space-1)">
          <span className="truncate font-(family-name:--font-display) text-(length:--fs-sm) font-semibold leading-(--lh-snug) text-(--text-strong)">
            {title}
          </span>
          <span className="text-(length:--fs-2xs) leading-(--lh-snug) text-(--text-body)">
            <LivePrice slug={TRACKS.find(t=>t.title===title)?.href?.split("/").pop()||""} initial={fee}/> · Next cohort {nextCohort}
          </span>
        </div>
        <div className="flex shrink-0 gap-(--space-2)">
          <Button size="sm" variant="outline" href="#curriculum" className="hidden sm:inline-flex">
            View curriculum
          </Button>
          <Button size="sm" href={`https://main.d16744ddqs159z.amplifyapp.com/student?course=${TRACKS.find(t=>t.title===title)?.href?.split("/").pop()||""}`}>
            Demo checkout
          </Button>
        </div>
      </div>
    </div>
  );
}

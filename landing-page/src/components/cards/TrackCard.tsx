import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/core/Badge";
import { Button } from "@/components/core/Button";
import { MetaGrid, type MetaItem } from "@/components/data/MetaGrid";
import { Card } from "@/components/core/Card";

type TrackCardProps = {
  number: string;
  family: string;
  title: string;
  description: string;
  badge?: string;
  meta: MetaItem[];
  exploreHref: string;
  enrolHref: string;
  prerequisitesHref: string;
  programmeHref: string;
};

/** Spans 7 rows of the parent grid via subgrid so titles, dividers and buttons line up across cards in a row. */
export function TrackCard({
  number,
  family,
  title,
  description,
  badge,
  meta,
  exploreHref,
  enrolHref,
  prerequisitesHref,
  programmeHref,
}: TrackCardProps) {
  return (
    <Card as="article" className="row-span-7 grid min-w-0 grid-rows-subgrid gap-y-0 p-(--card-pad)">
      <div className="flex min-h-(--space-6) items-center justify-between">
        <span className="text-(length:--fs-2xs) leading-none text-(--text-muted)">
          {number} · {family}
        </span>
        {badge ? <Badge>{badge}</Badge> : null}
      </div>
      <h3 className="mt-(--space-4) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-balance text-(--text-strong)">
        {title}
      </h3>
      <p className="mt-(--space-3) text-(length:--fs-xs) leading-(--lh-body) text-pretty text-(--text-body)">
        {description}
      </p>
      <MetaGrid items={meta} className="mt-(--space-5) border-t border-(--border-default) pt-(--space-5)" />
      <div className="min-h-(--space-6)" />
      <div className="flex flex-wrap gap-(--space-2)">
        <Button size="sm" icon={ArrowUpRight} href={exploreHref} className="flex-1">
          Explore course
        </Button>
        <Button size="sm" variant="outline" href={enrolHref} className="flex-1">
          Enrol in this course
        </Button>
      </div>
      <div className="mt-(--space-4) flex gap-(--space-4)">
        <Button size="sm" variant="link" href={prerequisitesHref}>
          View prerequisites
        </Button>
        <Button size="sm" variant="link" href={programmeHref}>
          Programme+
        </Button>
      </div>
    </Card>
  );
}

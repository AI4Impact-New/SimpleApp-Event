import type { Track } from "@/content/site";
import { TrackCard } from "./TrackCard";

type TrackLinks = {
  explore: string;
  enrol: string;
  prerequisites: string;
  programme: string;
};

type TrackGridProps = {
  tracks: Track[];
  links: TrackLinks;
  /** Renumber 01, 02… within this grid instead of using each track's global number. */
  renumber?: boolean;
  className?: string;
};

/** Responsive 1/2/3-column grid of TrackCards. */
export function TrackGrid({ tracks, links, renumber = false, className = "" }: TrackGridProps) {
  return (
    <div className={`grid gap-(--space-4) sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {tracks.map((t, i) => (
        <TrackCard
          key={t.id}
          number={renumber ? String(i + 1).padStart(2, "0") : t.number}
          family={t.family}
          title={t.title}
          description={t.description}
          badge={t.badge}
          meta={[
            { label: "Level", value: t.level },
            { label: "Duration", value: t.duration },
            { label: "Weekly", value: t.weekly },
            { label: "Projects", value: t.projects },
          ]}
          exploreHref={links.explore}
          enrolHref={links.enrol}
          prerequisitesHref={links.prerequisites}
          programmeHref={links.programme}
        />
      ))}
    </div>
  );
}

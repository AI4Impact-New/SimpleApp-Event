import { ArrowRight } from "lucide-react";
import { Button } from "@/components/core/Button";
import { TrackCard } from "@/components/cards/TrackCard";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { TRACKS } from "./content";
import { Section } from "./Section";

export function TracksSection() {
  return (
    <Section id="tracks">
      <SectionHeader
        eyebrow="Career tracks"
        title={
          <>
            Six roles. One standard:
            <br />
            can you do the work?
          </>
        }
        lead="Every track is built backwards from a real job: what the role does, what it ships and what hiring managers check."
        aside={
          <Button variant="outline" size="sm" icon={ArrowRight} href="#compare">
            Compare all tracks
          </Button>
        }
      />
      <div className="mt-(--space-10) grid gap-(--space-4) sm:grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((t) => (
          <TrackCard
            key={t.id}
            number={t.number}
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
            exploreHref="#compare"
            enrolHref="#guidance"
            prerequisitesHref="#finder"
            programmeHref="#programme"
          />
        ))}
      </div>
    </Section>
  );
}

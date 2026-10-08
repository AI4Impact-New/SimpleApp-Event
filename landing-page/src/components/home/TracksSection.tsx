import { ArrowRight } from "lucide-react";
import { Button } from "@/components/core/Button";
import { TrackGrid } from "@/components/cards/TrackGrid";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { TRACKS } from "@/content/site";
import { Section } from "@/components/layout/Section";

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
          <Button variant="outline" size="sm" icon={ArrowRight} href="/courses#compare">
            Compare all tracks
          </Button>
        }
      />
      <TrackGrid
        className="mt-(--space-10)"
        tracks={TRACKS}
        links={{ explore: "/courses", enrol: "#guidance", prerequisites: "#finder", programme: "#programme" }}
      />
    </Section>
  );
}

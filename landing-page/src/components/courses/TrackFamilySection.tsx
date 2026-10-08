import { TrackGrid } from "@/components/cards/TrackGrid";
import { Section, type SectionTone } from "@/components/layout/Section";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { TRACKS, type Track } from "@/content/site";

type TrackFamilySectionProps = {
  family: Track["family"];
  eyebrow: string;
  title: string;
  tone?: SectionTone;
};

/** One track family (Build / Data / Product) with its cards numbered within the family. */
export function TrackFamilySection({ family, eyebrow, title, tone }: TrackFamilySectionProps) {
  return (
    <Section id={family.toLowerCase()} tone={tone} pad="sm">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <TrackGrid
        className="mt-(--space-10)"
        tracks={TRACKS.filter((t) => t.family === family)}
        links={{ explore: "#compare", enrol: "#guidance", prerequisites: "/#finder", programme: "/#programme" }}
        renumber
      />
    </Section>
  );
}

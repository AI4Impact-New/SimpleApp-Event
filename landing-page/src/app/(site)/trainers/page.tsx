import type { Metadata } from "next";
import { TrainerProfileCard, type TrainerTile } from "@/components/cards/TrainerProfileCard";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { TRAINERS } from "@/content/site";

export const metadata: Metadata = {
  title: "Trainers · AI4Impact",
  description:
    "Every trainer records the lessons for their course and personally leads the weekly live clarification session.",
};

const TILE_CYCLE: TrainerTile[] = ["teal", "navy", "amber"];

export default function TrainersPage() {
  return (
    <>
      <PageHero
        background="grid"
        eyebrow="Faculty"
        title={
          <>
            Learn from people
            <br />
            who do the work.
          </>
        }
        lead="Every trainer records the lessons for their course and personally leads the weekly live clarification session."
      />
      <Section id="trainers" pad="sm">
        <ul className="grid gap-(--space-4) sm:grid-cols-2 lg:grid-cols-3">
          {TRAINERS.map((t, i) => (
            <li key={t.name} className="flex">
              <TrainerProfileCard {...t} tile={TILE_CYCLE[i % TILE_CYCLE.length]} profileHref={`/trainers/${t.slug}`} />
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

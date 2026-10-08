import { Button } from "@/components/core/Button";
import { TrainerCard } from "@/components/cards/TrainerCard";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { TRAINERS } from "@/content/site";
import { Section } from "@/components/layout/Section";

export function TrainersSection() {
  return (
    <Section id="trainers">
      <SectionHeader
        eyebrow="Trainers"
        title={
          <>
            Learn from people
            <br />
            who do this work.
          </>
        }
      />
      <div className="mt-(--space-10) grid gap-(--space-4) sm:grid-cols-2 lg:grid-cols-3">
        {TRAINERS.map((t) => (
          <TrainerCard key={t.name} {...t} />
        ))}
      </div>
      <div className="mt-(--space-6)">
        <Button variant="outline" size="sm" href="#">
          Meet all trainers
        </Button>
      </div>
    </Section>
  );
}

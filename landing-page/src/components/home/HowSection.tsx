import { CalendarClock, CirclePlay, Hammer, MessagesSquare } from "lucide-react";
import { CellGrid } from "@/components/cards/CellGrid";
import { FeatureCell } from "@/components/cards/FeatureCell";
import { StepCell } from "@/components/cards/StepCell";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { Section } from "@/components/layout/Section";

const STEPS = [
  { number: "01", title: "Choose", subtitle: "Pick a role, not a topic", description: "Six tracks, each mapped to a job you can apply for. A free call helps you choose." },
  { number: "02", title: "Learn", subtitle: "Recorded lessons, weekly live help", description: "Learn at your pace. Bring questions to the weekly clarification session." },
  { number: "03", title: "Build", subtitle: "Projects on realistic data", description: "Three or four reviewed projects and a fintech-first capstone." },
  { number: "04", title: "Prove", subtitle: "Earn the professional certificate", description: "Pass an independently reviewed capstone and defend it." },
  { number: "05", title: "Move", subtitle: "Optional Programme+", description: "Internship, mock interviews and recruiter recommendations." },
];

const FEATURES = [
  { icon: CirclePlay, title: "Recorded lessons", description: "Short, structured lessons you watch on your schedule." },
  { icon: Hammer, title: "Hands-on labs", description: "Every week ends with something built, not just watched." },
  { icon: MessagesSquare, title: "Weekly live clarification", description: "Bring blockers to a live session with your trainer." },
  { icon: CalendarClock, title: "Assessed projects", description: "Reviewed against a rubric, then rolled into your portfolio." },
];

export function HowSection() {
  return (
    <Section id="how">
      <SectionHeader
        eyebrow="How AI4Impact works"
        title="From choosing a role to doing it."
        lead="Structured learning, real projects, personal guidance and career acceleration, in that order."
      />
      <CellGrid columns="sm:grid-cols-2 lg:grid-cols-5" className="mt-(--space-12)">
        {STEPS.map((s) => (
          <StepCell key={s.number} {...s} />
        ))}
      </CellGrid>
      <CellGrid columns="sm:grid-cols-2 lg:grid-cols-4" className="mt-(--space-12)">
        {FEATURES.map((f) => (
          <FeatureCell key={f.title} {...f} />
        ))}
      </CellGrid>
    </Section>
  );
}

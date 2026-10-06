import { ArrowRight } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Chip } from "@/components/core/Chip";
import { CellGrid } from "@/components/cards/CellGrid";
import { ModuleCell } from "@/components/cards/ModuleCell";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { Section } from "./Section";

const JOURNEY = ["Learn", "Build", "Intern", "Practise", "Apply", "Interview"];

export function ProgrammeSection() {
  return (
    <Section id="programme" tone="alt">
      <div className="grid items-start gap-(--space-12) lg:grid-cols-[1fr_1.1fr] lg:gap-(--space-16)">
        <div>
          <SectionHeader
            eyebrow="Optional career layer"
            title={
              <>
                Programme+. One
                <br />
                bundle for the
                <br />
                move into the role.
              </>
            }
            lead={
              <>
                Add it to any track. Five modules that take you from a finished capstone to real interviews, for{" "}
                <b className="font-semibold text-(--text-strong)">₹24,999</b>.
              </>
            }
          />
          <ol
            aria-label="Programme+ journey"
            className="mt-(--space-6) flex max-w-md flex-wrap items-center gap-x-(--space-2) gap-y-(--space-3)"
          >
            {JOURNEY.map((step, i) => (
              <li key={step} className="flex items-center gap-(--space-2)">
                <Chip>{step}</Chip>
                {i < JOURNEY.length - 1 ? (
                  <ArrowRight size={14} aria-hidden className="text-(--text-body)" />
                ) : null}
              </li>
            ))}
          </ol>
          <div className="mt-(--space-8)">
            <Button size="sm" icon={ArrowRight} href="#">
              See what Programme+ includes
            </Button>
          </div>
        </div>
        <CellGrid columns="sm:grid-cols-2">
          <ModuleCell
            className="sm:col-span-2"
            number="01"
            title="Real-World Internship"
            description="3 months on a live project, with mentor reviews."
            note="Freshers and recent graduates only. Subject to eligibility and project availability."
          />
          <ModuleCell number="02" title="Interview Builder" description="CV review, 10 AI-assisted mock interviews and a plan to improve." />
          <ModuleCell number="03" title="Recruitment Support" description="Recommendations through 10+ recruitment and consultancy relationships." />
          <ModuleCell number="04" title="Weekly Group Clarification" description="A recurring live session every week for questions and reviews." />
          <ModuleCell number="05" title="Personal Handholding" description="Five individual 30-minute sessions, booked when you need them." />
        </CellGrid>
      </div>
    </Section>
  );
}

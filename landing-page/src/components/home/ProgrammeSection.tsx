import { ArrowRight } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Chip } from "@/components/core/Chip";
import { CellGrid } from "@/components/cards/CellGrid";
import { ModuleCell } from "@/components/cards/ModuleCell";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { PROGRAMME_PLUS } from "@/content/site";
import { Section } from "@/components/layout/Section";

const { journey: JOURNEY, modules: MODULES, price } = PROGRAMME_PLUS;

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
                <b className="font-semibold text-(--text-strong)">{price}</b>.
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
            <Button size="sm" icon={ArrowRight} href="/programme-plus">
              See what Programme+ includes
            </Button>
          </div>
        </div>
        <CellGrid columns="sm:grid-cols-2">
          {MODULES.map((m, i) => (
            <ModuleCell
              key={m.number}
              className={i === 0 ? "sm:col-span-2" : ""}
              number={m.number}
              title={m.title}
              description={m.description}
              note={m.note}
            />
          ))}
        </CellGrid>
      </div>
    </Section>
  );
}

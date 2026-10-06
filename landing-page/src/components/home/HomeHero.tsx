import { ArrowRight } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Eyebrow } from "@/components/core/Eyebrow";
import { Stat } from "@/components/data/Stat";
import { HeroVisual } from "./HeroVisual";

const STATS = [
  { value: "6", label: "role-led tracks" },
  { value: "3–4", label: "portfolio projects each" },
  { value: "Weekly", label: "live clarification" },
];

export function HomeHero() {
  return (
    <section id="top" className="bg-hero-grid">
      <div className="mx-auto grid max-w-(--container) items-center gap-(--space-16) px-(--container-pad) py-(--space-20) lg:grid-cols-[1.2fr_1fr] lg:py-(--space-24)">
        <div>
          <Eyebrow tone="onDark">Career school for AI, data and product roles</Eyebrow>

          <h1 className="mt-(--space-6) font-(family-name:--font-display) font-bold text-(length:--fs-h3) leading-(--lh-tight) tracking-(--ls-display) text-(--text-on-dark) sm:text-(length:--fs-h2) lg:text-(length:--fs-hero)">
            Choose the role.
            <br />
            Build the skills.
            <br />
            <span className="text-(--text-on-dark-accent)">Prove you can do the work.</span>
          </h1>

          <p className="mt-(--space-8) max-w-xl text-(length:--fs-lead) leading-(--lh-lead) text-(--text-on-dark-body)">
            AI4Impact combines structured learning, real-world projects, personal guidance and
            career acceleration to help you move from learning AI to doing the work.
          </p>

          <div className="mt-(--space-8) flex flex-wrap gap-(--space-3)">
            <Button variant="light" size="lg" icon={ArrowRight} href="#tracks">
              Explore career tracks
            </Button>
            <Button variant="dark-ghost" size="lg" href="#guidance">
              Book free career guidance
            </Button>
          </div>

          <div className="mt-(--space-12) grid grid-cols-2 gap-(--space-6) sm:grid-cols-3 border-t border-(--border-dark) pt-(--space-8)">
            {STATS.map(({ value, label }) => (
              <Stat key={label} value={value} label={label} />
            ))}
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

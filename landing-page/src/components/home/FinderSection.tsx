"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/core/Button";
import { Eyebrow } from "@/components/core/Eyebrow";
import { MetaGrid } from "@/components/data/MetaGrid";
import { ChoiceOption } from "@/components/forms/ChoiceOption";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { FINDER_OPTIONS, TRACKS } from "./content";
import { Section } from "./Section";

export function FinderSection() {
  const [selected, setSelected] = useState(0);
  const track = TRACKS.find((t) => t.id === FINDER_OPTIONS[selected].trackId) ?? TRACKS[0];

  return (
    <Section id="finder" tone="alt">
      <SectionHeader eyebrow="Is this right for me?" title="Start from where you want to be." />
      <div className="mt-(--space-12) grid items-start gap-(--space-10) lg:grid-cols-2">
        <div role="radiogroup" aria-labelledby="finder-question" className="flex flex-col gap-(--space-2)">
          <span
            id="finder-question"
            className="mb-(--space-2) text-(length:--fs-xs) leading-none text-(--text-body)"
          >
            What do you want to be doing in a year?
          </span>
          {FINDER_OPTIONS.map((option, i) => (
            <ChoiceOption key={option.label} selected={i === selected} onClick={() => setSelected(i)}>
              {option.label}
            </ChoiceOption>
          ))}
        </div>

        <div
          aria-live="polite"
          className="rounded-(--radius-3xl) border border-(--border-default) bg-(--surface-card) px-(--space-8) pt-(--space-8) pb-(--space-8) lg:mt-(--space-6)"
        >
          <Eyebrow>Your best-fit track</Eyebrow>
          <h3 className="mt-(--space-6) font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
            {track.title}
          </h3>
          <p className="mt-(--space-5) text-(length:--fs-body) leading-(--lh-body) text-(--text-body)">
            {track.description}
          </p>
          <div className="my-(--space-6) h-px bg-(--border-default)" />
          <MetaGrid
            items={[
              { label: "You'll need", value: track.need ?? track.level },
              { label: "Time", value: `${track.duration} · ${track.weekly}/week` },
            ]}
          />
          {track.roles ? (
            <MetaGrid
              columns={1}
              className="mt-(--space-5)"
              items={[{ label: "Roles it prepares you for", value: track.roles }]}
            />
          ) : null}
          <div className="mt-(--space-6) flex flex-wrap gap-(--space-3)">
            <Button size="sm" icon={ArrowRight} href="#tracks">
              Explore this track
            </Button>
            <Button size="sm" variant="outline" href="#guidance">
              Still unsure? Talk to us
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

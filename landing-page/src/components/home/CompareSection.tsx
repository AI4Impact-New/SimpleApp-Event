import { CompareTable, type CompareColumn } from "@/components/data/CompareTable";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { TRACKS } from "./content";
import { Section } from "./Section";

type Row = {
  title: string;
  family: string;
  level: string;
  duration: string;
  weekly: string;
  projects: number;
  fee: string;
};

const COLUMNS: CompareColumn<Row>[] = [
  { key: "title", label: "Track" },
  { key: "family", label: "Family", muted: true },
  { key: "level", label: "Level" },
  { key: "duration", label: "Duration" },
  { key: "weekly", label: "Weekly effort" },
  { key: "projects", label: "Projects" },
  { key: "fee", label: "Fee", align: "right" },
];

const ROWS: Row[] = TRACKS.map((t) => ({
  title: t.title,
  family: t.family,
  level: t.level,
  duration: t.duration,
  weekly: `${t.weekly}/week`,
  projects: t.projectCount,
  fee: t.fee,
}));

export function CompareSection() {
  return (
    <Section id="compare" tone="alt">
      <SectionHeader eyebrow="Compare" title="All tracks at a glance." />
      <CompareTable className="mt-(--space-10)" columns={COLUMNS} rows={ROWS} />
    </Section>
  );
}

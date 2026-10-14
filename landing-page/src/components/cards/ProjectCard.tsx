import { Database } from "lucide-react";
import type { ReactNode } from "react";
import { Chip } from "@/components/core/Chip";
import { CodeWindow } from "./CodeWindow";
import { Card } from "@/components/core/Card";

type ProjectCardProps = {
  windowTitle: string;
  preview: ReactNode;
  title: string;
  description: string;
  dataset: string;
  tags: string[];
  /** `dark` for navy bands (home); `light` for slate bands (course pages). */
  theme?: "dark" | "light";
  /** Span 2 rows of the parent grid via subgrid so previews and titles line up across a row. */
  subgrid?: boolean;
};

const THEMES = {
  dark: { title: "text-(--text-on-dark)", body: "text-(--text-on-dark-body)", dataset: "text-(--text-on-dark-muted)", icon: "", tag: "tag" },
  light: { title: "text-(--text-strong)", body: "text-(--text-body)", dataset: "text-(--text-body)", icon: "text-(--text-accent)", tag: "tag-light" },
} as const;

/** Project card: code-window preview, title, dataset line, deliverable tags. */
export function ProjectCard({ windowTitle, preview, title, description, dataset, tags, theme = "dark", subgrid = false }: ProjectCardProps) {
  const styles = THEMES[theme];
  return (
    <Card
      as="article"
      theme={theme}
      className={`min-w-0 p-(--space-4) ${subgrid ? "row-span-2 grid grid-rows-subgrid gap-y-0" : "flex flex-1 flex-col"}`}
    >
      <CodeWindow title={windowTitle} className="min-h-(--space-30)">
        {preview}
      </CodeWindow>
      <div className="flex flex-1 flex-col px-(--space-1) pt-(--space-6) pb-(--space-2)">
        <h3 className={`font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) ${styles.title}`}>
          {title}
        </h3>
        <p className={`mt-(--space-3) text-(length:--fs-xs) leading-(--lh-body) ${styles.body}`}>
          {description}
        </p>
        <p className={`mt-(--space-2) flex items-start gap-(--space-2) text-(length:--fs-2xs) leading-(--lh-snug) ${styles.dataset}`}>
          <Database size={14} aria-hidden className={`mt-px shrink-0 ${styles.icon}`} />
          {dataset}
        </p>
        <ul className="mt-auto flex flex-wrap gap-(--space-2) pt-(--space-5)" aria-label="Deliverables">
          {tags.map((t) => (
            <li key={t}>
              <Chip variant={styles.tag}>{t}</Chip>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

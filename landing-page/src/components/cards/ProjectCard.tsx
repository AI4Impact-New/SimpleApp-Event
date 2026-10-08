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
};

/** Dark project card: code-window preview, title, dataset line, deliverable tags. */
export function ProjectCard({ windowTitle, preview, title, description, dataset, tags }: ProjectCardProps) {
  return (
    <Card as="article" theme="dark" className="flex min-w-0 flex-1 flex-col p-(--space-4)">
      <CodeWindow title={windowTitle} className="min-h-(--space-30)">
        {preview}
      </CodeWindow>
      <div className="flex flex-1 flex-col px-(--space-1) pt-(--space-6) pb-(--space-2)">
        <h3 className="font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-on-dark)">
          {title}
        </h3>
        <p className="mt-(--space-3) text-(length:--fs-xs) leading-(--lh-body) text-(--text-on-dark-body)">
          {description}
        </p>
        <p className="mt-(--space-2) flex items-start gap-(--space-2) text-(length:--fs-2xs) leading-(--lh-snug) text-(--text-on-dark-muted)">
          <Database size={14} aria-hidden className="mt-px shrink-0" />
          {dataset}
        </p>
        <ul className="mt-auto flex flex-wrap gap-(--space-2) pt-(--space-5)" aria-label="Deliverables">
          {tags.map((t) => (
            <li key={t}>
              <Chip variant="tag">{t}</Chip>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

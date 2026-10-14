import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/core/Card";

export type AccordionItem = {
  title: ReactNode;
  /** Muted line under the title, visible while collapsed. */
  subtitle?: ReactNode;
  /** Leading marker, e.g. a week number. */
  leading?: ReactNode;
  content: ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  className?: string;
};

/** Card of native <details> rows split by hairlines. No client JS; each row opens independently. */
export function Accordion({ items, className = "" }: AccordionProps) {
  return (
    <Card className={`divide-y divide-(--border-default) overflow-hidden ${className}`}>
      {items.map((item, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-(--space-4) px-(--space-6) py-(--space-5) [&::-webkit-details-marker]:hidden">
            {item.leading}
            <span className="flex min-w-0 flex-1 flex-col gap-(--space-1)">
              <span className="font-(family-name:--font-display) text-(length:--fs-body) font-semibold leading-(--lh-snug) text-(--text-strong)">
                {item.title}
              </span>
              {item.subtitle ? (
                <span className="text-(length:--fs-2xs) leading-(--lh-snug) text-(--text-body)">{item.subtitle}</span>
              ) : null}
            </span>
            <ChevronDown
              size={16}
              aria-hidden
              className="shrink-0 text-(--text-body) transition-transform duration-(--dur-base) ease-(--ease-out) group-open:rotate-180"
            />
          </summary>
          <div className="px-(--space-6) pb-(--space-6)">{item.content}</div>
        </details>
      ))}
    </Card>
  );
}

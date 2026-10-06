import type { ReactNode } from "react";

export type MetaItem = { label: ReactNode; value: ReactNode };

type MetaGridProps = {
  items: MetaItem[];
  columns?: 1 | 2;
  theme?: "light" | "dark";
  className?: string;
};

/** Label / value pairs: small muted label over a medium value. */
export function MetaGrid({ items, columns = 2, theme = "light", className = "" }: MetaGridProps) {
  const dark = theme === "dark";
  return (
    <dl
      className={`grid gap-x-(--space-6) gap-y-(--space-4) ${columns === 2 ? "grid-cols-2" : "grid-cols-1"} ${className}`}
    >
      {items.map((item, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-(--space-1)">
          <dt
            className={`text-(length:--fs-2xs) leading-(--lh-snug) ${dark ? "text-(--text-on-dark-muted)" : "text-(--text-muted)"}`}
          >
            {item.label}
          </dt>
          <dd
            className={`text-(length:--fs-sm) font-medium leading-(--lh-snug) ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

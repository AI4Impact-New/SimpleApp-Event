import type { ReactNode } from "react";
import { Card } from "@/components/core/Card";

export type CompareColumn<Row> = {
  key: keyof Row & string;
  label: string;
  align?: "left" | "right";
  muted?: boolean;
};

type CompareTableProps<Row> = {
  columns: CompareColumn<Row>[];
  rows: Row[];
  className?: string;
};

/** Bordered comparison table. First column is the row label. */
export function CompareTable<Row extends Record<string, ReactNode>>({
  columns,
  rows,
  className = "",
}: CompareTableProps<Row>) {
  return (
    <Card className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`h-(--space-10) whitespace-nowrap border-b border-(--border-default) bg-(--slate-50) px-(--space-5) text-(length:--fs-2xs) font-medium leading-none text-(--text-muted) ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? "" : "border-t border-(--border-default)"}>
              {columns.map((c, ci) => {
                const Cell = ci === 0 ? "th" : "td";
                return (
                  <Cell
                    key={c.key}
                    scope={ci === 0 ? "row" : undefined}
                    className={`h-(--space-12) px-(--space-5) text-(length:--fs-xs) leading-(--lh-snug) tabular-nums ${ci === 0 ? "min-w-(--space-30) font-medium" : "whitespace-nowrap font-normal"} ${c.muted ? "text-(--text-muted)" : "text-(--text-strong)"} ${c.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {row[c.key]}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

import type { ReactNode } from "react";

type CellGridProps = {
  /** Tailwind grid-cols classes, e.g. "sm:grid-cols-2 lg:grid-cols-5". */
  columns: string;
  children: ReactNode;
  className?: string;
};

/** One bordered 20px-radius panel split into cells by 1px hairlines. */
export function CellGrid({ columns, children, className = "" }: CellGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-(--radius-3xl) border border-(--border-default) bg-(--border-default) ${columns} ${className}`}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";

type CodeWindowProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

/** Faux editor window: three grey dots + mono path, mono body. Dark surfaces only. */
export function CodeWindow({ title, children, className = "" }: CodeWindowProps) {
  return (
    <div
      className={`overflow-hidden rounded-(--radius-xl) border border-(--border-dark) bg-(--navy-950) ${className}`}
    >
      <div className="flex h-(--space-10) items-center gap-(--space-3) border-b border-(--border-dark) px-(--space-3)">
        <span className="flex gap-(--space-1)" aria-hidden>
          <i className="size-(--space-2) rounded-(--radius-pill) bg-(--navy-500)" />
          <i className="size-(--space-2) rounded-(--radius-pill) bg-(--navy-500)" />
          <i className="size-(--space-2) rounded-(--radius-pill) bg-(--navy-500)" />
        </span>
        <span className="truncate font-(family-name:--font-mono) text-(length:--fs-label) leading-none text-(--text-on-dark-body)">
          {title}
        </span>
      </div>
      <div className="px-(--space-4) py-(--space-4) font-(family-name:--font-mono) text-(length:--fs-label) leading-(--lh-lead) text-(--text-on-dark-body)">
        {children}
      </div>
    </div>
  );
}

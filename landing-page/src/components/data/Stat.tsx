import type { ReactNode } from "react";

type StatProps = {
  value: ReactNode;
  label: ReactNode;
  theme?: "dark" | "light";
};

/** Hero proof-point: big display value + short lowercase label. Place 3 in a row under a 1px divider. */
export function Stat({ value, label, theme = "dark" }: StatProps) {
  const dark = theme === "dark";
  return (
    <div className="flex flex-col gap-(--space-2)">
      <span
        className={`font-(family-name:--font-display) font-bold text-(length:--fs-h3) leading-none tracking-(--ls-heading) ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
      >
        {value}
      </span>
      <span
        className={`text-(length:--fs-xs) leading-(--lh-snug) ${dark ? "text-(--text-on-dark-body)" : "text-(--text-body)"}`}
      >
        {label}
      </span>
    </div>
  );
}

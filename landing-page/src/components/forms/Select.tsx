import { ChevronDown } from "lucide-react";

type SelectProps = {
  label: string;
  name: string;
  options: string[];
  theme?: "dark" | "light";
};

export function Select({ label, name, options, theme = "dark" }: SelectProps) {
  const dark = theme === "dark";
  return (
    <label className="flex min-w-0 flex-col gap-(--space-2)">
      <span
        className={`text-(length:--fs-sm) font-medium leading-(--lh-snug) ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
      >
        {label}
      </span>
      <span className="relative block">
        <select
          name={name}
          className={`h-(--h-btn-md) w-full cursor-pointer appearance-none rounded-(--radius-input) border pr-(--space-10) pl-(--space-4) text-(length:--fs-sm) leading-none outline-none transition-colors duration-(--dur-base) ease-(--ease-out) focus:border-(--teal-500) ${dark ? "border-(--border-dark-strong) bg-(--surface-dark-raised) text-(--text-on-dark)" : "border-(--border-default) bg-(--surface-card) text-(--text-strong)"}`}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden
          className={`pointer-events-none absolute top-1/2 right-(--space-3) -translate-y-1/2 ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
        />
      </span>
    </label>
  );
}

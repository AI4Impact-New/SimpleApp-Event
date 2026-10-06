import { Check } from "lucide-react";
import type { ReactNode } from "react";

type CheckboxProps = {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  theme?: "dark" | "light";
  children: ReactNode;
};

export function Checkbox({ name, checked, onChange, theme = "dark", children }: CheckboxProps) {
  const dark = theme === "dark";
  const box = checked
    ? "border-(--teal-500) bg-(--teal-500)"
    : dark
      ? "border-(--border-dark-strong) bg-(--surface-dark-raised)"
      : "border-(--border-strong) bg-(--surface-card)";
  return (
    <label className="flex cursor-pointer items-start gap-(--space-3)">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-(--space-1) flex size-(--space-4) shrink-0 items-center justify-center rounded-(--radius-xs) border peer-focus-visible:outline-2 peer-focus-visible:outline-(--teal-500) ${box}`}
      >
        {checked ? <Check size={12} strokeWidth={3} className="text-(--white)" /> : null}
      </span>
      <span
        className={`text-(length:--fs-2xs) leading-(--lh-body) ${dark ? "text-(--text-on-dark-body)" : "text-(--text-body)"}`}
      >
        {children}
      </span>
    </label>
  );
}

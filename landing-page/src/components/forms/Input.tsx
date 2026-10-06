import type { HTMLInputTypeAttribute } from "react";

type InputProps = {
  label: string;
  name: string;
  type?: HTMLInputTypeAttribute;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
  theme?: "dark" | "light";
};

export function Input({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  required,
  theme = "dark",
}: InputProps) {
  const dark = theme === "dark";
  return (
    <label className="flex min-w-0 flex-col gap-(--space-2)">
      <span
        className={`text-(length:--fs-sm) font-medium leading-(--lh-snug) ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
      >
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        className={`h-(--h-input) w-full rounded-(--radius-input) border px-(--space-3) text-(length:--fs-sm) leading-none outline-none transition-colors duration-(--dur-base) ease-(--ease-out) focus:border-(--teal-500) ${dark ? "border-(--border-dark-strong) bg-(--surface-dark-input) text-(--text-on-dark)" : "border-(--border-default) bg-(--surface-card) text-(--text-strong)"}`}
      />
    </label>
  );
}

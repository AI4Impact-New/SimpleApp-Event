import type { HTMLInputTypeAttribute } from "react";

type InputProps = {
  label: string;
  name: string;
  type?: HTMLInputTypeAttribute;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  theme?: "dark" | "light";
};

export function Input({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`h-(--h-input) w-full rounded-(--radius-input) border px-(--space-3) text-(length:--fs-sm) leading-none outline-none transition-colors duration-(--dur-base) ease-(--ease-out) focus:border-(--teal-500) ${dark ? "border-(--border-dark-strong) bg-(--surface-dark-input) text-(--text-on-dark) placeholder:text-(--text-on-dark-muted)" : "border-(--border-default) bg-(--surface-card) text-(--text-strong) placeholder:text-(--text-muted)"}`}
      />
    </label>
  );
}

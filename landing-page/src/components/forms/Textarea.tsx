type TextareaProps = {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  theme?: "dark" | "light";
};

export function Textarea({ label, name, placeholder, rows = 3, required, maxLength, theme = "dark" }: TextareaProps) {
  const dark = theme === "dark";
  return (
    <label className="flex min-w-0 flex-col gap-(--space-2)">
      <span
        className={`text-(length:--fs-sm) font-medium leading-(--lh-snug) ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
      >
        {label}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={rows}
        required={required}
        maxLength={maxLength}
        className={`w-full resize-y rounded-(--radius-input) border px-(--space-3) py-(--space-2) text-(length:--fs-sm) leading-(--lh-body) outline-none transition-colors duration-(--dur-base) ease-(--ease-out) focus:border-(--teal-500) ${dark ? "border-(--border-dark-strong) bg-(--surface-dark-input) text-(--text-on-dark) placeholder:text-(--text-on-dark-muted)" : "border-(--border-default) bg-(--surface-card) text-(--text-strong) placeholder:text-(--text-muted)"}`}
      />
    </label>
  );
}

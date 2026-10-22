"use client";

import { useId } from "react";
import ReactSelect, { type StylesConfig } from "react-select";

type SelectProps = {
  label: string;
  name: string;
  options: string[];
  theme?: "dark" | "light";
};

type Option = { value: string; label: string };

function stylesFor(dark: boolean): StylesConfig<Option, false> {
  const text = dark ? "var(--text-on-dark)" : "var(--text-strong)";
  const surface = dark ? "var(--surface-dark-raised)" : "var(--surface-card)";
  const border = dark ? "var(--border-dark-strong)" : "var(--border-default)";
  return {
    control: (base, { isFocused }) => ({
      ...base,
      minHeight: "var(--h-btn-md)",
      cursor: "pointer",
      borderRadius: "var(--radius-input)",
      background: surface,
      borderColor: isFocused ? "var(--teal-500)" : border,
      boxShadow: "none",
      fontSize: "var(--fs-sm)",
      transition: "border-color var(--dur-base) var(--ease-out)",
      "&:hover": { borderColor: isFocused ? "var(--teal-500)" : border },
    }),
    valueContainer: (base) => ({ ...base, paddingLeft: "var(--space-4)" }),
    singleValue: (base) => ({ ...base, color: text }),
    input: (base) => ({ ...base, color: text }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base, { selectProps }) => ({
      ...base,
      color: text,
      transform: selectProps.menuIsOpen ? "rotate(180deg)" : undefined,
      transition: "transform var(--dur-base) var(--ease-out)",
      "&:hover": { color: text },
    }),
    menu: (base) => ({
      ...base,
      overflow: "hidden",
      borderRadius: "var(--radius-input)",
      border: `1px solid ${border}`,
      background: surface,
      boxShadow: "0 12px 32px rgb(0 0 0 / 0.35)",
      zIndex: 20,
    }),
    menuList: (base) => ({ ...base, padding: 4 }),
    option: (base, { isSelected, isFocused }) => ({
      ...base,
      cursor: "pointer",
      borderRadius: "calc(var(--radius-input) - 2px)",
      fontSize: "var(--fs-sm)",
      color: isSelected ? "var(--teal-500)" : text,
      fontWeight: isSelected ? 600 : 400,
      background: isFocused ? (dark ? "var(--surface-dark-input)" : "var(--border-default)") : "transparent",
      "&:active": { background: dark ? "var(--surface-dark-input)" : "var(--border-default)" },
    }),
  };
}

export function Select({ label, name, options, theme = "dark" }: SelectProps) {
  const dark = theme === "dark";
  const id = useId();
  const items = options.map((o) => ({ value: o, label: o }));
  return (
    <div className="flex min-w-0 flex-col gap-(--space-2)">
      <label
        htmlFor={id}
        className={`text-(length:--fs-sm) font-medium leading-(--lh-snug) ${dark ? "text-(--text-on-dark)" : "text-(--text-strong)"}`}
      >
        {label}
      </label>
      <ReactSelect<Option, false>
        instanceId={id}
        inputId={id}
        name={name}
        options={items}
        defaultValue={items[0]}
        isSearchable={false}
        styles={stylesFor(dark)}
      />
    </div>
  );
}

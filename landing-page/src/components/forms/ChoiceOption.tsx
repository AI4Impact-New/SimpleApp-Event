import type { ReactNode } from "react";

type ChoiceOptionProps = {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

/** Large single-select option. Selected = teal-tinted fill + teal border. */
export function ChoiceOption({ selected = false, onClick, children }: ChoiceOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex h-(--h-option) w-full cursor-pointer items-center rounded-(--radius-xl) border px-(--space-5) text-left text-(length:--fs-body) font-medium leading-none text-(--text-strong) transition-colors duration-(--dur-base) ease-(--ease-out) ${selected ? "border-(--teal-600) bg-(--surface-selected)" : "border-(--border-default) bg-(--surface-card) hover:border-(--border-strong)"}`}
    >
      {children}
    </button>
  );
}

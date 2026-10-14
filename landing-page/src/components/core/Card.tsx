import type { ReactNode } from "react";

const THEMES = {
  light: "border-(--border-default) bg-(--surface-card)",
  dark: "border-(--border-dark) bg-(--surface-dark-raised)",
};

type CardProps = {
  /** `light` = white on slate bands; `dark` = navy-raised on dark bands. */
  theme?: keyof typeof THEMES;
  as?: "div" | "article";
  /** Teal border + float shadow on hover, for cards that link somewhere. */
  interactive?: boolean;
  /** Padding and layout go here; the card only owns the surface. */
  className?: string;
  "aria-live"?: "polite" | "off";
  children: ReactNode;
};

/** Base card surface: 20px radius, 1px border, no shadow at rest. Floating artefacts (certificate, hero mock) don't use this. */
const INTERACTIVE =
  "transition-[border-color,box-shadow] duration-(--dur-base) ease-(--ease-out) hover:border-(--teal-500)/60 hover:shadow-(--shadow-float)";

export function Card({ theme = "light", as: Tag = "div", interactive = false, className = "", children, ...rest }: CardProps) {
  return (
    <Tag
      className={`rounded-(--radius-3xl) border ${THEMES[theme]} ${interactive ? INTERACTIVE : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

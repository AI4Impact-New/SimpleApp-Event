import type { ReactNode } from "react";

const THEMES = {
  light: "border-(--border-default) bg-(--surface-card)",
  dark: "border-(--border-dark) bg-(--surface-dark-raised)",
};

type CardProps = {
  /** `light` = white on slate bands; `dark` = navy-raised on dark bands. */
  theme?: keyof typeof THEMES;
  as?: "div" | "article";
  /** Padding and layout go here; the card only owns the surface. */
  className?: string;
  "aria-live"?: "polite" | "off";
  children: ReactNode;
};

/** Base card surface: 20px radius, 1px border, no shadow. Floating artefacts (certificate, hero mock) don't use this. */
export function Card({ theme = "light", as: Tag = "div", className = "", children, ...rest }: CardProps) {
  return (
    <Tag className={`rounded-(--radius-3xl) border ${THEMES[theme]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

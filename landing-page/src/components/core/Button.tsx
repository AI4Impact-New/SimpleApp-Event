import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "primary" | "outline" | "light" | "dark-ghost" | "promo" | "link";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { className: string; iconSize: number }> = {
  sm: {
    className: "h-(--h-btn-sm) px-(--space-4) gap-(--space-2) rounded-(--radius-btn) text-(length:--fs-xs)",
    iconSize: 14,
  },
  md: {
    className: "h-(--h-btn-md) px-(--space-5) gap-(--space-2) rounded-(--radius-btn) text-(length:--fs-sm)",
    iconSize: 15,
  },
  lg: {
    className: "h-(--h-btn-lg) px-(--space-6) gap-(--space-2) rounded-(--radius-btn-lg) text-(length:--fs-body)",
    iconSize: 16,
  },
};

const LINK_SIZES: Record<Size, string> = {
  sm: "h-auto p-0 gap-(--space-2) text-(length:--fs-xs)",
  md: "h-auto p-0 gap-(--space-2) text-(length:--fs-sm)",
  lg: "h-auto p-0 gap-(--space-2) text-(length:--fs-body)",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-(--navy-800) text-(--white) border-(--navy-800) hover:bg-(--navy-700) hover:text-(--white)",
  outline:
    "bg-(--surface-card) text-(--text-strong) border-(--border-default) hover:border-(--border-strong) hover:text-(--text-strong)",
  light:
    "bg-(--slate-100) text-(--text-strong) border-(--slate-100) hover:bg-(--white) hover:text-(--text-strong)",
  "dark-ghost":
    "bg-(--surface-dark-raised) text-(--text-on-dark) border-(--border-dark-strong) hover:border-(--slate-500) hover:text-(--text-on-dark)",
  promo:
    "bg-(--amber-500) text-(--amber-950) border-(--amber-500) hover:bg-(--amber-600) hover:text-(--amber-950)",
  link: "bg-transparent text-(--text-body) border-transparent hover:text-(--text-strong)",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  /** Trailing icon, usually ArrowRight or ArrowUpRight. */
  icon?: LucideIcon;
  /** Leading icon, e.g. LogIn. */
  leadingIcon?: LucideIcon;
  fullWidth?: boolean;
  disabled?: boolean;
  href?: string;
  /** Native button type; use "submit" inside forms. Ignored with href. */
  type?: "button" | "submit";
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  icon: TrailingIcon,
  leadingIcon: LeadingIcon,
  fullWidth = false,
  disabled = false,
  href,
  type = "button",
  onClick,
  children,
  className = "",
}: ButtonProps) {
  const s = SIZES[size];
  const isLink = variant === "link";
  const classes = [
    fullWidth ? "flex w-full" : "inline-flex",
    "items-center justify-center whitespace-nowrap border font-medium leading-none no-underline",
    "transition-colors duration-(--dur-base) ease-(--ease-out)",
    isLink ? LINK_SIZES[size] : s.className,
    VARIANTS[variant],
    disabled ? "cursor-not-allowed opacity-45 pointer-events-none" : "cursor-pointer",
    className,
  ].join(" ");

  const content = (
    <>
      {LeadingIcon ? <LeadingIcon size={s.iconSize + 2} aria-hidden /> : null}
      {children}
      {TrailingIcon ? <TrailingIcon size={s.iconSize} aria-hidden /> : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} aria-disabled={disabled || undefined}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}

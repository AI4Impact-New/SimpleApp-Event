import Image from "next/image";

type LogoProps = {
  /** `light` for light backgrounds, `dark` for navy. */
  variant?: "light" | "dark";
  className?: string;
};

const VARIANTS = {
  light: { mark: "/logo-mark-navy.svg", text: "text-(--text-strong)", accent: "text-(--teal-600)" },
  dark: { mark: "/logo-mark-white.svg", text: "text-(--text-on-dark)", accent: "text-(--teal-400)" },
};

/** Lockup: A4 mark tile + "AI4Impact" wordmark (Impact in teal). */
export function Logo({ variant = "light", className = "" }: LogoProps) {
  const v = VARIANTS[variant];
  return (
    <span className={`flex shrink-0 items-center gap-(--space-3) ${className}`}>
      <Image
        src={v.mark}
        width={48}
        height={48}
        alt=""
        priority={variant === "light"}
        className="block size-(--space-8) shrink-0"
      />
      <span
        className={`font-(family-name:--font-display) text-(length:--fs-h5) font-bold leading-none tracking-(--ls-heading) ${v.text}`}
      >
        AI4<span className={v.accent}>Impact</span>
      </span>
    </span>
  );
}

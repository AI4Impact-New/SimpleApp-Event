import Image from "next/image";

type LogoProps = {
  /** `light` for light backgrounds, `dark` for navy. */
  variant?: "light" | "dark";
  className?: string;
};

const LOGOS = {
  light: { src: "/logo-light.png", width: 272, height: 86 },
  dark: { src: "/logo-dark.png", width: 272, height: 90 },
};

export function Logo({ variant = "light", className = "" }: LogoProps) {
  const logo = LOGOS[variant];
  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt="AI4Impact"
      priority={variant === "light"}
      className={`block h-(--space-10) w-auto shrink-0 ${className}`}
    />
  );
}

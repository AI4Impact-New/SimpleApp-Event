import { LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/core/Button";
import { Logo } from "@/components/core/Logo";
import { NavLinks } from "./NavLinks";

export type NavLink = { label: string; href: string };

type NavBarProps = {
  links: NavLink[];
  guidanceHref: string;
  loginHref: string;
};

/** Sticky 64px nav on slate-50 with a 1px bottom border. */
export function NavBar({ links, guidanceHref, loginHref }: NavBarProps) {
  return (
    <header className="sticky top-0 z-10 h-(--h-nav) border-b border-(--border-default) bg-(--slate-50)">
      <div className="mx-auto flex h-full max-w-(--container) items-center gap-(--space-6) px-(--container-pad)">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <NavLinks links={links} />
        <div className="ml-auto flex items-center gap-(--space-4) lg:ml-0">
          <a
            href={guidanceHref}
            className="hidden whitespace-nowrap text-(length:--fs-xs) font-medium leading-none text-(--text-strong) hover:text-(--text-strong) sm:inline"
          >
            Free career guidance
          </a>
          <Button variant="outline" size="sm" leadingIcon={LogIn} href={loginHref}>
            Student login
          </Button>
        </div>
      </div>
    </header>
  );
}

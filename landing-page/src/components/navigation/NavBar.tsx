import { LogIn } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Logo } from "@/components/core/Logo";

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
        <a href="#top" className="shrink-0">
          <Logo />
        </a>
        <nav aria-label="Main" className="mx-auto hidden h-full gap-(--space-6) lg:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="flex h-full items-center whitespace-nowrap text-(length:--fs-xs) leading-none text-(--text-body) hover:text-(--text-strong) hover:no-underline"
            >
              {l.label}
            </a>
          ))}
        </nav>
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

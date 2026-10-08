"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "./NavBar";

/** Primary nav links. Active route: navy text + 2px teal underline. */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="mx-auto hidden h-full gap-(--space-6) lg:flex">
      {links.map((l) => {
        const active = !l.href.includes("#") && pathname.startsWith(l.href);
        return (
          <Link
            key={l.label}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-full items-center whitespace-nowrap border-b-2 text-(length:--fs-xs) leading-none hover:text-(--text-strong) hover:no-underline ${active ? "border-(--teal-600) font-medium text-(--text-strong)" : "border-transparent text-(--text-body)"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

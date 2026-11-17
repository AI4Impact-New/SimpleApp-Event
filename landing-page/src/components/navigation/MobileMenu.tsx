"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavLink } from "./NavBar";

/** Hamburger toggle + dropdown panel for the primary nav below the lg breakpoint. */
export function MobileMenu({ links, guidanceHref }: { links: NavLink[]; guidanceHref: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes (incl. back/forward), without an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-(--h-btn-sm) w-(--h-btn-sm) items-center justify-center rounded-(--radius-btn) border border-(--border-default) bg-(--surface-card) text-(--text-strong) hover:border-(--border-strong)"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <>
          <div
            aria-hidden
            onClick={close}
            className="fixed inset-x-0 bottom-0 top-(--h-nav) bg-black/30"
          />
          <nav
            id="mobile-menu"
            aria-label="Mobile"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--h-nav))] overflow-y-auto border-b border-(--border-default) bg-(--slate-50) px-(--container-pad) py-(--space-4)"
          >
            <ul className="flex flex-col">
              {links.map((l) => {
                const active = !l.href.includes("#") && pathname.startsWith(l.href);
                return (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={`block border-l-2 py-(--space-3) pl-(--space-3) text-(length:--fs-sm) hover:text-(--text-strong) hover:no-underline ${active ? "border-(--teal-600) font-medium text-(--text-strong)" : "border-transparent text-(--text-body)"}`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-(--space-2) border-t border-(--border-default) pt-(--space-2)">
                <a
                  href={guidanceHref}
                  onClick={close}
                  className="block py-(--space-3) pl-(--space-3) text-(length:--fs-sm) font-medium text-(--text-strong) hover:no-underline"
                >
                  Free career guidance
                </a>
              </li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

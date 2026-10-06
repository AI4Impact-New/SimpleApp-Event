import { ArrowRight } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/core/Button";

type AnnouncementBarProps = {
  items: string[];
  ctaLabel: string;
  ctaHref: string;
};

/** 40px navy marquee above the nav. Items scroll continuously; the CTA stays put. */
export function AnnouncementBar({ items, ctaLabel, ctaHref }: AnnouncementBarProps) {
  const loop = [...items, ...items];
  return (
    <div className="flex h-(--h-topbar) items-center overflow-hidden bg-(--surface-topbar)">
      <p className="sr-only">{items.join(". ")}</p>
      <div className="marquee-mask min-w-0 flex-1 overflow-hidden" aria-hidden>
        <div className="animate-marquee flex w-max items-center gap-(--space-8)">
          {loop.map((text, i) => (
            <Fragment key={i}>
              <span className="whitespace-nowrap text-(length:--fs-xs) font-medium leading-none text-(--text-on-dark)">
                {text}
              </span>
              <span className="text-(--text-on-dark-muted)">·</span>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="px-(--space-3)">
        <Button variant="light" size="sm" icon={ArrowRight} href={ctaHref}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}

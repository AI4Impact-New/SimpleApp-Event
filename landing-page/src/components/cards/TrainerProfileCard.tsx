import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/core/Badge";
import { Card } from "@/components/core/Card";

const TILES = {
  teal: "bg-(--teal-600) text-(--white)",
  navy: "bg-(--navy-800) text-(--white)",
  amber: "bg-(--amber-500) text-(--amber-950)",
};

export type TrainerTile = keyof typeof TILES;

type TrainerProfileCardProps = {
  name: string;
  initials: string;
  role?: string;
  subtitle: string;
  assignments: string[];
  tile?: TrainerTile;
  profileHref: string;
};

/** Trainers-page card: large initials tile, name (+ optional role), specialism, track assignments and a profile link. */
export function TrainerProfileCard({
  name,
  initials,
  role,
  subtitle,
  assignments,
  tile = "navy",
  profileHref,
}: TrainerProfileCardProps) {
  return (
    <Card as="article" className="flex w-full min-w-0 flex-col p-(--space-6)">
      <div className="flex items-center gap-(--space-5)">
        <span
          aria-hidden
          className={`flex size-(--space-16) shrink-0 items-center justify-center rounded-(--radius-xl) font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-none ${TILES[tile]}`}
        >
          {initials}
        </span>
        <div className="flex min-w-0 flex-col gap-(--space-1)">
          <h3 className="font-(family-name:--font-display) text-(length:--fs-h5) font-semibold leading-(--lh-snug) text-(--text-strong)">
            {name}
          </h3>
          {role ? <p className="text-(length:--fs-xs) leading-(--lh-snug) text-(--text-body)">{role}</p> : null}
        </div>
      </div>
      <p className="mt-(--space-6) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">{subtitle}</p>
      <ul aria-label="Teaches" className="mt-(--space-4) flex flex-wrap gap-(--space-2)">
        {assignments.map((a) => (
          <li key={a}>
            <Badge>{a}</Badge>
          </li>
        ))}
      </ul>
      <a
        href={profileHref}
        className="mt-auto inline-flex items-center gap-(--space-2) self-start pt-(--space-6) text-(length:--fs-sm) font-medium leading-none text-(--text-accent) no-underline hover:text-(--teal-700)"
      >
        View profile
        <ArrowRight size={15} aria-hidden />
        <span className="sr-only">: {name}</span>
      </a>
    </Card>
  );
}

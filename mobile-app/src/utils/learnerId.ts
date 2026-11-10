/**
 * Learner ID shown to students, derived from their account UUID (users.id).
 * Display only: the full UUID stays the real identifier; this is a short, readable form of it.
 */
export function learnerIdFromUuid(uuid: string | null | undefined): string | null {
  const hex = (uuid ?? '').replace(/-/g, '').toUpperCase();
  if (!/^[0-9A-F]{8}/.test(hex)) return null;
  return `AI4I-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/** Up to two initials for an avatar ("Aarav Sharma" -> "AS"). */
export function initialsFor(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

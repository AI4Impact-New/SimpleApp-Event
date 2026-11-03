import { api } from "./api";
export type ProgrammeRow = Record<string, unknown> & { id: string };
export type ProgrammePage = {
  items: ProgrammeRow[];
  next_cursor: string | null;
};
export const programme = {
  request: <T = ProgrammeRow>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ) => api.learningRequest<T>(method, path, body),
  access: () =>
    api.learningRequest<{
      admin: boolean;
      courses: { course_id: string; title: string }[];
    }>("GET", "/programme/staff/access"),
};

/** Convert wall-clock input in an explicitly chosen IANA zone; never assume the browser's zone. */
export function zonedInputToIso(
  value: string,
  zone: string,
  ambiguity: "reject" | "earlier" | "later" = "reject",
): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Enter a complete date and time.");
  const [y, m, d, h, min] = value.split(/[-T:]/).map(Number);
  const nominal = Date.UTC(y, m - 1, d, h, min);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const matches: number[] = [];
  for (let offset = -840; offset <= 840; offset += 15) {
    const candidate = nominal - offset * 60000;
    const parts = Object.fromEntries(
      formatter.formatToParts(candidate).map((p) => [p.type, p.value]),
    );
    if (
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` ===
      value
    )
      matches.push(candidate);
  }
  matches.sort((a, b) => a - b);
  if (!matches.length)
    throw new Error(
      "This local time does not exist in the selected time zone. Choose another time.",
    );
  if (matches.length > 1 && ambiguity === "reject")
    throw new Error(
      "This time occurs twice during daylight saving. Select earlier or later occurrence.",
    );
  return new Date(
    ambiguity === "later" ? matches[matches.length - 1] : matches[0],
  ).toISOString();
}
export function isoToZonedInput(value: string, zone: string): string {
  if (!value) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

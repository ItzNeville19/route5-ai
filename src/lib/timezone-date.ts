/** Calendar date key (YYYY-MM-DD) in an IANA timezone — for daily insight rotation & briefings. */

export function dateKeyInTimezone(timezone: string | undefined): string {
  const tz = timezone?.trim() || "UTC";
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    /* fall through */
  }
  return new Date().toISOString().slice(0, 10);
}

/** Local hour (0–23) in the given IANA timezone — for greetings and time-aware copy. */
export function hourInTimezone(timezone: string | undefined): number {
  const tz = timezone?.trim() || "UTC";
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value;
    if (h !== undefined) return Number.parseInt(h, 10);
  } catch {
    /* fall through */
  }
  return new Date().getHours();
}

/** Common IANA zones for settings UI (subset). */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

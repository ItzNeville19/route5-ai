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

/** e.g. "9:24 AM" (or localized) in the user workspace timezone. */
export function formatClockInTimezone(
  timezone: string | undefined,
  locale: string = "en-US"
): string {
  const tz = timezone?.trim();
  const loc = locale?.trim() || "en-US";
  try {
    if (tz) {
      return new Date().toLocaleTimeString(loc, {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
      });
    }
  } catch {
    /* fall through */
  }
  return new Date().toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" });
}

/** Short city-style label when no curated region is chosen (IANA → friendly string). */
export function shortTimezoneLabel(timezone: string | undefined): string {
  const tz = timezone?.trim();
  if (!tz) return "";
  const map: Record<string, string> = {
    "America/New_York": "New York",
    "America/Chicago": "Chicago",
    "America/Winnipeg": "Winnipeg",
    "America/Denver": "Denver",
    "America/Los_Angeles": "Los Angeles",
    "America/Vancouver": "Vancouver",
    "America/Toronto": "Toronto",
    "America/Mexico_City": "Mexico City",
    "America/Bogota": "Bogotá",
    "America/Lima": "Lima",
    "America/Santiago": "Santiago",
    "America/Buenos_Aires": "Buenos Aires",
    "America/Argentina/Buenos_Aires": "Buenos Aires",
    "America/Sao_Paulo": "São Paulo",
    "Europe/London": "London",
    "Europe/Dublin": "Dublin",
    "Europe/Paris": "Paris",
    "Europe/Berlin": "Berlin",
    "Europe/Madrid": "Madrid",
    "Europe/Amsterdam": "Amsterdam",
    "Europe/Brussels": "Brussels",
    "Europe/Zurich": "Zurich",
    "Europe/Stockholm": "Stockholm",
    "Europe/Warsaw": "Warsaw",
    "Asia/Dubai": "Dubai",
    "Asia/Kolkata": "India",
    "Asia/Riyadh": "Riyadh",
    "Asia/Tel_Aviv": "Tel Aviv",
    "Asia/Bangkok": "Bangkok",
    "Asia/Singapore": "Singapore",
    "Asia/Hong_Kong": "Hong Kong",
    "Asia/Shanghai": "Shanghai",
    "Asia/Seoul": "Seoul",
    "Asia/Tokyo": "Tokyo",
    "Australia/Sydney": "Sydney",
    "Pacific/Auckland": "Auckland",
    "Africa/Johannesburg": "Johannesburg",
    UTC: "UTC",
  };
  if (map[tz]) return map[tz]!;
  try {
    const parts = tz.split("/");
    return parts[parts.length - 1]?.replace(/_/g, " ") ?? tz;
  } catch {
    return tz;
  }
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

/** Common IANA zones for settings — international coverage; order is UX grouping. */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Winnipeg",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Riyadh",
  "Asia/Tel_Aviv",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

import IANA_TIMEZONES_FALLBACK from "@/lib/data/iana-timezones-fallback.json";
import { COMMON_TIMEZONES } from "@/lib/timezone-date";

/** Older prefs / docs may use deprecated paths — map to current IANA IDs. */
const LEGACY_IANA_ALIASES: Record<string, string> = {
  "America/Argentina/Buenos_Aires": "America/Buenos_Aires",
};

let cachedList: string[] | null = null;

function fromIntl(): string[] | null {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    if (typeof intl.supportedValuesOf !== "function") return null;
    const raw = intl.supportedValuesOf("timeZone");
    return raw.slice().sort((a, b) => a.localeCompare(b));
  } catch {
    return null;
  }
}

/**
 * All IANA timezones the runtime supports (typically 400+), sorted.
 * Uses `Intl.supportedValuesOf("timeZone")` when available; otherwise a bundled CLDR-aligned list.
 */
export function getAllIanaTimezones(): string[] {
  if (cachedList) return cachedList;
  const fromApi = fromIntl();
  cachedList = fromApi ?? (IANA_TIMEZONES_FALLBACK as string[]);
  return cachedList;
}

export function normalizeLegacyIana(tz: string | undefined): string {
  const t = tz?.trim();
  if (!t) return t ?? "";
  return LEGACY_IANA_ALIASES[t] ?? t;
}

/** True if this ID appears in the supported list (after legacy normalization). */
export function isKnownIanaTimezone(tz: string | undefined): boolean {
  const n = normalizeLegacyIana(tz);
  if (!n) return false;
  return getAllIanaTimezones().includes(n);
}

/**
 * Short offset label for picker rows, e.g. "GMT−5" / "GMT+5:30".
 */
export function formatGmtOffsetLabel(timezone: string, at: Date = new Date()): string {
  const tz = timezone.trim();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(at);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Primary line for picker: city-style + IANA + offset. */
export function formatTimezonePickerPrimary(timezone: string): string {
  const tz = timezone.trim();
  const parts = tz.split("/");
  const city = parts[parts.length - 1]?.replace(/_/g, " ") ?? tz;
  return city;
}

export function formatTimezonePickerSecondary(timezone: string): string {
  const off = formatGmtOffsetLabel(timezone);
  return off ? `${timezone} · ${off}` : timezone;
}

/** Suggested zones shown first when the search box is empty. */
export function getSuggestedTimezoneOrder(): readonly string[] {
  return COMMON_TIMEZONES;
}

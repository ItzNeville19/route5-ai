/**
 * System location hints — same source iOS/macOS use on the web: `Intl` (no GPS permission).
 */

/** IANA zone from the browser (Apple / Chromium / Firefox all expose this). */
export function getBrowserIanaTimezone(): string {
  if (typeof Intl === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** BCP 47 locale for time formatting — matches OS language when available. */
export function getBrowserLocale(): string {
  if (typeof navigator === "undefined") return "en-US";
  return navigator.language || "en-US";
}

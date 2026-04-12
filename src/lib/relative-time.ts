export function formatRelativeShort(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * Relative time in the given locale (BCP 47), e.g. for list timestamps on Desk.
 */
export function formatRelativeLong(iso: string, locale = "en-US"): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const m = Math.floor(diffSec / 60);
  if (m < 60) return rtf.format(-m, "minute");
  const h = Math.floor(m / 60);
  if (h < 24) return rtf.format(-h, "hour");
  const d = Math.floor(h / 24);
  if (d < 7) return rtf.format(-d, "day");
  const w = Math.floor(d / 7);
  if (w < 5) return rtf.format(-w, "week");
  const mo = Math.floor(d / 30);
  if (mo < 12) return rtf.format(-mo, "month");
  const y = Math.floor(d / 365);
  return rtf.format(-y, "year");
}

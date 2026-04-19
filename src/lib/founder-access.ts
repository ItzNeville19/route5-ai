/**
 * Founder / owner overrides — client-safe list via NEXT_PUBLIC_*.
 * Pair with ROUTE5_ULTIMATE_EMAILS (server entitlements) for full Enterprise caps.
 */
const FOUNDER_EMAILS = new Set(
  (process.env.NEXT_PUBLIC_ROUTE5_FOUNDER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return FOUNDER_EMAILS.has(email.trim().toLowerCase());
}

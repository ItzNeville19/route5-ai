/** Single source for public contact info (marketing, mailto, copy). All support / help mailto links must use this address. */
export const CONTACT_EMAIL = "neville@rayze.xyz" as const;
export const INSTAGRAM_URL =
  "https://www.instagram.com/route5.ai?igsh=M2o3c2FoZXdldmM2" as const;

export function mailtoHref(subject: string, body?: string): string {
  const q = new URLSearchParams();
  q.set("subject", subject);
  if (body) q.set("body", body);
  return `mailto:${CONTACT_EMAIL}?${q.toString()}`;
}

/** Explicit support mailto — same as {@link mailtoHref}; use when embedding in UI so the address can’t drift. */
export function supportMailtoHref(subject: string, body?: string): string {
  return mailtoHref(subject, body);
}

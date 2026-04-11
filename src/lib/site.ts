/** Single source for public contact info (marketing, mailto, copy). */
export const CONTACT_EMAIL = "neville@rayze.xyz" as const;

export function mailtoHref(subject: string, body?: string): string {
  const q = new URLSearchParams();
  q.set("subject", subject);
  if (body) q.set("body", body);
  return `mailto:${CONTACT_EMAIL}?${q.toString()}`;
}

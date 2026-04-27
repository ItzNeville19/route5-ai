/**
 * Canonical public origin for Stripe return URLs, OAuth callbacks, email links, and redirects.
 *
 * If `NEXT_PUBLIC_APP_URL` is set to localhost (common from copied `.env`) but the app runs on
 * Vercel, we prefer the deployment host so users are never sent to 127.0.0.1 from production.
 */
function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

function normalizeOrigin(raw: string): string {
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

function isLocalDevelopmentUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return isLocalHostname(u.hostname);
  } catch {
    return false;
  }
}

export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const vercel = process.env.VERCEL_URL?.trim();

  if (process.env.VERCEL && vercel && (!explicit || isLocalDevelopmentUrl(explicit))) {
    return normalizeOrigin(vercel);
  }

  if (explicit && !isLocalDevelopmentUrl(explicit)) {
    return normalizeOrigin(explicit);
  }

  if (vercel) {
    return normalizeOrigin(vercel);
  }

  if (explicit) {
    return normalizeOrigin(explicit);
  }

  return "http://localhost:3000";
}

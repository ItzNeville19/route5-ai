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
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }

  if (explicit && !isLocalDevelopmentUrl(explicit)) {
    return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  }

  if (vercel) {
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }

  if (explicit) {
    return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  }

  return "http://localhost:3000";
}

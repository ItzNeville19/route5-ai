const DEFAULT_AUTH_REDIRECT = "/desk";

function normalizeLocalPath(path: string): string {
  if (!path.startsWith("/")) return DEFAULT_AUTH_REDIRECT;
  if (path.startsWith("//")) return DEFAULT_AUTH_REDIRECT;
  return path;
}

/**
 * Reads Clerk-compatible `redirect_url` query values and enforces in-app path redirects only.
 * Rejects absolute/external URLs to avoid open redirect vulnerabilities.
 */
export function getSafeAuthRedirectFromSearch(
  searchParams: URLSearchParams,
  fallback = DEFAULT_AUTH_REDIRECT
): string {
  const raw = searchParams.get("redirect_url")?.trim();
  if (!raw) return fallback;
  return normalizeLocalPath(raw);
}

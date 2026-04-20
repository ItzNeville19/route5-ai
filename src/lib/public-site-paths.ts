/**
 * Paths that should be readable without a signed-in user (YC/reviewer-friendly).
 * Keep in sync with `isPublicRoute` in `src/proxy.ts`.
 */
export function isPublicWorkspaceGuidePath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/docs" || pathname.startsWith("/docs/")) return true;
  if (pathname === "/support") return true;
  return false;
}

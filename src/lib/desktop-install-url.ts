/**
 * Legacy public path — kept for bookmarks. `GET` is handled by
 * `app/installers/[filename]/route.ts` (302 to env URL or `/download`).
 */
export const LEGACY_MAC_INSTALLER_PATH = "/installers/Route5-mac.dmg";

export function isDesktopDownloadConfigured(): boolean {
  const env = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim();
  return Boolean(env);
}

/** Absolute installer URL when env is set; otherwise empty (use `/download` in UI). */
export function getDesktopDownloadUrl(): string {
  return process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim() ?? "";
}

/** Same as `getDesktopDownloadUrl` for client bundles. */
export function getPublicDesktopDownloadHref(): string {
  return getDesktopDownloadUrl();
}

/** Prefer direct installer URL; fall back to marketing download page (always valid). */
export function resolveDesktopDownloadHref(): string {
  const direct = getPublicDesktopDownloadHref();
  return direct || "/download";
}

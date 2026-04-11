import type { MarketplaceApp } from "@/lib/marketplace-catalog";

/** Appends `origin=marketplace` for unified analytics and deep-link handling. */
export function appendMarketplaceOrigin(href: string): string {
  if (!href.startsWith("/")) return href;
  const [pathOnly, hash] = href.split("#");
  const u = new URL(pathOnly, "https://route5.local");
  u.searchParams.set("origin", "marketplace");
  const q = u.searchParams.toString();
  return `${u.pathname}${q ? `?${q}` : ""}${hash ? `#${hash}` : ""}`;
}

/**
 * Primary launch URL from a marketplace app tile — merges query params and maps
 * hash-only routes to searchParams the workspace shell understands.
 */
export function launchHrefForApp(app: MarketplaceApp): string {
  const href = app.href;
  if (!href) return "/marketplace";
  if (href.startsWith("http")) return href;

  if (href === "/projects#new-project") {
    return "/projects?focus=new-project&origin=marketplace";
  }

  return appendMarketplaceOrigin(href);
}

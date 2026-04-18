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

  if (href === "/overview#new-project") {
    return "/overview?focus=new-project&origin=marketplace";
  }

  return appendMarketplaceOrigin(href);
}

/**
 * After enabling a marketplace listing, navigate here so the user lands on a real screen:
 * Settings (AI prefs) for engines/providers, or the integration page for actions.
 */
export function marketplaceAfterEnableHref(app: MarketplaceApp): string {
  if (app.kind === "installable" && app.id === "linear-action") {
    return appendMarketplaceOrigin("/integrations/linear");
  }

  const base = launchHrefForApp(app);
  if (app.kind !== "installable") return base;

  const pathOnly = base.includes("#") ? base.slice(0, base.indexOf("#")) : base;

  if (app.category === "ai-providers") {
    return `${pathOnly}#llm-provider`;
  }
  return `${pathOnly}#extraction-provider`;
}

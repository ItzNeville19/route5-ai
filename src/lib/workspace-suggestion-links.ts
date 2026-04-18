/** Canonical “more info” targets for workspace suggestions — all real routes. */

export const DOCS_PRODUCT = "/docs/product";
export const DOCS_ROADMAP = "/docs/roadmap";
/** Map a primary action path to documentation or a deeper in-app page. */
export function learnMoreForHref(href: string): string {
  if (href.startsWith("/integrations/")) {
    if (
      href.includes("/linear") ||
      href.includes("/github") ||
      href.includes("/figma") ||
      href.includes("/google") ||
      href.includes("/slack")
    ) {
      return href;
    }
    return "/settings#connections";
  }
  if (href.startsWith("/marketplace")) return "/marketplace";
  if (href === "/settings" || href.startsWith("/settings#")) return DOCS_PRODUCT;
  if (href === "/reports" || href === "/team-insights") return DOCS_PRODUCT;
  if (href.startsWith("/desk") || href === "/overview") return DOCS_PRODUCT;
  if (href === "/workspace/digest" || href === "/workspace/customize" || href === "/workspace/apps") {
    return DOCS_PRODUCT;
  }
  if (href === "/account/plans") return "/account/plans";
  if (href === "/support") return "/support";
  if (href === "/onboarding") return DOCS_PRODUCT;
  if (href === "/docs" || href.startsWith("/docs/")) return href;
  return DOCS_PRODUCT;
}

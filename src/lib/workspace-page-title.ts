/**
 * Primary workspace chrome title (header left column).
 */
export function getWorkspacePageTitle(pathname: string): string {
  const p = pathname.split("?")[0] ?? pathname;
  if (p === "/feed") return "Desk";
  if (p === "/capture") return "Capture";
  if (p === "/overview") return "Leadership";
  if (p === "/desk" || p.startsWith("/desk")) return "Desk";
  if (p === "/projects" || p.startsWith("/projects/")) return "Projects";
  if (p === "/settings" || p.startsWith("/settings/")) return "Settings";
  if (p === "/workspace/customize" || p.startsWith("/workspace/customize/")) return "Customize";
  if (p === "/marketplace" || p.startsWith("/marketplace/")) return "Marketplace";
  if (p === "/integrations" || p.startsWith("/integrations/")) return "Integrations";
  if (p === "/workspace/help") return "Help";
  if (p === "/workspace/chat") return "Chat";
  if (p === "/workspace/team" || p === "/workspace/organization") return "Organization";
  if (p.startsWith("/workspace/billing")) return "Billing";
  if (p.startsWith("/workspace/notifications")) return "Notifications";
  return "Route5";
}

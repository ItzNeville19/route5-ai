/** Normalize AI / legacy dashboard shortcut paths to real routes. */

const HREF_FIXUPS: Record<string, string> = {
  "/dashboard": "/desk",
  "/workspace/dashboard": "/desk",
  "/workspace": "/desk",
  "/home": "/desk",
  "/projects": "/projects",
};

export function normalizeDashboardShortcutHref(href: string): string {
  const t = href.trim();
  return HREF_FIXUPS[t] ?? t;
}

export function normalizeDashboardShortcutList(
  list: { label: string; href: string }[]
): { label: string; href: string }[] {
  return list.map((s) => ({
    ...s,
    href: normalizeDashboardShortcutHref(s.href),
  }));
}

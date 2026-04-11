/** Client preferences — localStorage, namespaced. */

const KEY = "route5:workspacePrefs.v1";

export type WorkspacePrefsV1 = {
  compact?: boolean;
  focusMode?: boolean;
  /** Left nav: icon rail only (desktop). Expands on hover while collapsed. */
  sidebarCollapsed?: boolean;
  /** Right rail (history / API). Default closed — history lives in the left sidebar. */
  rightPanelOpen?: boolean;
  rightPanelTab?: "activity" | "api";
  pinnedProjectIds?: string[];
  marketplaceFavorites?: string[];
  /** App Store “installed” ids — native/stack detail pages. */
  installedMarketplaceAppIds?: string[];
  /** AI / manual hero subtitle for the projects dashboard. */
  dashboardCompanyNote?: string;
  /** Up to 6 quick links merged into the Jump strip (from AI customize). */
  dashboardAiShortcuts?: { label: string; href: string }[];
  /** IANA timezone — daily insight order & “today” boundaries sync here. */
  workspaceTimezone?: string;
  /** When true, first insight card is picked automatically for the session (default on). */
  insightsAutoShow?: boolean;
  /** Legacy preference (optional). Customize lives at `/workspace/customize`. */
  commandCenterMode?: "auto" | "on" | "off";
};

const defaultPrefs: WorkspacePrefsV1 = {
  rightPanelTab: "activity",
  rightPanelOpen: false,
};

export function loadWorkspacePrefs(): WorkspacePrefsV1 {
  if (typeof window === "undefined") return { ...defaultPrefs };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultPrefs };
    const o = JSON.parse(raw) as WorkspacePrefsV1;
    return {
      ...defaultPrefs,
      ...o,
      rightPanelOpen:
        typeof o.rightPanelOpen === "boolean"
          ? o.rightPanelOpen
          : (defaultPrefs.rightPanelOpen ?? false),
      rightPanelTab:
        o.rightPanelTab === "activity" || o.rightPanelTab === "api"
          ? o.rightPanelTab
          : defaultPrefs.rightPanelTab,
      pinnedProjectIds: Array.isArray(o.pinnedProjectIds)
        ? o.pinnedProjectIds.filter((id): id is string => typeof id === "string")
        : [],
      marketplaceFavorites: Array.isArray(o.marketplaceFavorites)
        ? o.marketplaceFavorites.filter((id): id is string => typeof id === "string")
        : [],
      installedMarketplaceAppIds: Array.isArray(o.installedMarketplaceAppIds)
        ? o.installedMarketplaceAppIds.filter((id): id is string => typeof id === "string")
        : [],
      dashboardCompanyNote:
        typeof o.dashboardCompanyNote === "string"
          ? o.dashboardCompanyNote.slice(0, 2000)
          : undefined,
      dashboardAiShortcuts: Array.isArray(o.dashboardAiShortcuts)
        ? o.dashboardAiShortcuts
            .filter(
              (x): x is { label: string; href: string } =>
                x &&
                typeof x === "object" &&
                typeof (x as { label?: string }).label === "string" &&
                typeof (x as { href?: string }).href === "string" &&
                (x as { href: string }).href.startsWith("/")
            )
            .slice(0, 6)
        : [],
      workspaceTimezone:
        typeof o.workspaceTimezone === "string" && o.workspaceTimezone.length < 80
          ? o.workspaceTimezone
          : undefined,
      insightsAutoShow:
        typeof o.insightsAutoShow === "boolean" ? o.insightsAutoShow : undefined,
      commandCenterMode:
        o.commandCenterMode === "auto" ||
        o.commandCenterMode === "on" ||
        o.commandCenterMode === "off"
          ? o.commandCenterMode
          : undefined,
    };
  } catch {
    return { ...defaultPrefs };
  }
}

export function saveWorkspacePrefs(next: WorkspacePrefsV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function scratchKey(projectId: string): string {
  return `route5:scratch:${projectId}`;
}

export function loadScratch(projectId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(scratchKey(projectId)) ?? "";
  } catch {
    return "";
  }
}

export function saveScratch(projectId: string, text: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scratchKey(projectId), text);
  } catch {
    /* ignore */
  }
}

export function inputDraftKey(projectId: string): string {
  return `route5:inputDraft:${projectId}`;
}

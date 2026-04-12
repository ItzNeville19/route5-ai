/** Client preferences — localStorage, namespaced. */

import {
  normalizeDashboardShortcutHref,
  normalizeDashboardShortcutList,
} from "@/lib/dashboard-shortcut-href";
import type { WorkspaceThemeId } from "@/lib/workspace-themes";
import { WORKSPACE_THEME_IDS } from "@/lib/workspace-themes";
import type { UiLocaleCode } from "@/lib/i18n/ui-locales";
import { isUiLocaleCode } from "@/lib/i18n/ui-locales";
import type { WorkspaceSurfaceMaterialId } from "@/lib/workspace-surface-material";
import { isWorkspaceSurfaceMaterialId } from "@/lib/workspace-surface-material";

const KEY = "route5:workspacePrefs.v1";

/** Session flag: user tapped “Apply location” — prefer local TZ over stale server until POST catches up. */
export const WORKSPACE_TZ_DIRTY_SESSION_KEY = "route5:workspaceTzDirty";

/**
 * Persists across tabs and hard refresh until a timezone POST succeeds.
 * Lets merge ignore stale server TZ while Clerk catches up.
 */
export const WORKSPACE_TZ_PENDING_SYNC_KEY = "route5:workspaceTzPending";

export function clearWorkspaceTzPendingSync(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WORKSPACE_TZ_PENDING_SYNC_KEY);
  } catch {
    /* ignore */
  }
}

function isWorkspaceThemeId(s: string): s is WorkspaceThemeId {
  return (WORKSPACE_THEME_IDS as readonly string[]).includes(s);
}

export type WorkspacePrefsV1 = {
  compact?: boolean;
  focusMode?: boolean;
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
  /** Sub-region label key — pairs with `workspaceTimezone` (see `workspace-regions`). */
  workspaceRegionKey?: string;
  /** Mesh / gradient backgrounds on the command canvas (off = flat, easier on eyes). */
  appearanceGradients?: boolean;
  /**
   * Workspace look — see `/workspace/customize` for previews.
   * Legacy `appearanceSchedule` is migrated on read (day→daytime, night→classic).
   */
  appearanceTheme?: WorkspaceThemeId;
  /** @deprecated Use `appearanceTheme`. Kept for migration only. */
  appearanceSchedule?: "auto" | "day" | "night";
  /** Legacy preference (optional). Customize lives at `/workspace/customize`. */
  commandCenterMode?: "auto" | "on" | "off";
  /** Fully hide the left sidebar (header button / floating control brings it back). */
  sidebarHidden?: boolean;
  /** Extraction pipeline preference — see `ai-provider-presets`. */
  extractionProviderId?: string;
  /** LLM preference for future multi-step flows — stored for UI consistency. */
  llmProviderId?: string;
  /** UI language (en, es, …). Omit to follow the browser. */
  uiLocale?: UiLocaleCode;
  /** Sidebar, header, and dashboard glass: liquid | balanced standard | flat (no blur). */
  surfaceMaterial?: WorkspaceSurfaceMaterialId;
};

const defaultPrefs: WorkspacePrefsV1 = {
  extractionProviderId: "auto",
  llmProviderId: "auto",
  appearanceGradients: true,
  appearanceTheme: "auto",
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
            .map((x) => ({
              label: x.label,
              href: normalizeDashboardShortcutHref(x.href),
            }))
            .slice(0, 6)
        : [],
      workspaceTimezone:
        typeof o.workspaceTimezone === "string" && o.workspaceTimezone.length < 80
          ? o.workspaceTimezone
          : undefined,
      workspaceRegionKey:
        typeof o.workspaceRegionKey === "string" && o.workspaceRegionKey.length < 64
          ? o.workspaceRegionKey
          : undefined,
      appearanceGradients:
        typeof o.appearanceGradients === "boolean" ? o.appearanceGradients : undefined,
      appearanceTheme: (() => {
        if (typeof o.appearanceTheme === "string" && isWorkspaceThemeId(o.appearanceTheme)) {
          return o.appearanceTheme;
        }
        if (o.appearanceSchedule === "day") return "daytime";
        if (o.appearanceSchedule === "night") return "classic";
        if (o.appearanceSchedule === "auto") return "auto";
        return defaultPrefs.appearanceTheme;
      })(),
      appearanceSchedule:
        o.appearanceSchedule === "auto" ||
        o.appearanceSchedule === "day" ||
        o.appearanceSchedule === "night"
          ? o.appearanceSchedule
          : undefined,
      commandCenterMode:
        o.commandCenterMode === "auto" ||
        o.commandCenterMode === "on" ||
        o.commandCenterMode === "off"
          ? o.commandCenterMode
          : undefined,
      sidebarHidden: typeof o.sidebarHidden === "boolean" ? o.sidebarHidden : undefined,
      extractionProviderId:
        typeof o.extractionProviderId === "string" && o.extractionProviderId.length < 80
          ? o.extractionProviderId
          : defaultPrefs.extractionProviderId,
      llmProviderId:
        typeof o.llmProviderId === "string" && o.llmProviderId.length < 80
          ? o.llmProviderId
          : defaultPrefs.llmProviderId,
      uiLocale:
        typeof o.uiLocale === "string" && isUiLocaleCode(o.uiLocale)
          ? o.uiLocale
          : undefined,
      surfaceMaterial:
        typeof o.surfaceMaterial === "string" && isWorkspaceSurfaceMaterialId(o.surfaceMaterial)
          ? o.surfaceMaterial
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

/** Deep-merge a prefs patch (used by client UI and server sync). */
export function mergeWorkspacePrefsPatch(
  prev: WorkspacePrefsV1,
  patch: Partial<WorkspacePrefsV1>
): WorkspacePrefsV1 {
  const next = { ...prev, ...patch };
  if (patch.pinnedProjectIds !== undefined) {
    next.pinnedProjectIds = [...patch.pinnedProjectIds];
  }
  if (patch.marketplaceFavorites !== undefined) {
    next.marketplaceFavorites = [...patch.marketplaceFavorites];
  }
  if (patch.installedMarketplaceAppIds !== undefined) {
    next.installedMarketplaceAppIds = [...patch.installedMarketplaceAppIds];
  }
  if (patch.dashboardAiShortcuts !== undefined) {
    next.dashboardAiShortcuts = normalizeDashboardShortcutList([...patch.dashboardAiShortcuts]);
  }
  if (Array.isArray(next.dashboardAiShortcuts)) {
    next.dashboardAiShortcuts = normalizeDashboardShortcutList(next.dashboardAiShortcuts);
  }
  return next;
}

function meaningfulString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Merge GET /api/workspace/prefs (Clerk privateMetadata) into local prefs.
 * Never let an empty or stale server string wipe timezone, region, locale, or notes
 * the user already has on this device (e.g. logged out before POST synced).
 */
export function mergeRemoteWorkspacePrefs(
  local: WorkspacePrefsV1,
  remote: Partial<WorkspacePrefsV1>
): { merged: WorkspacePrefsV1; repaired: boolean } {
  const remoteClean = { ...remote };
  delete remoteClean.sidebarHidden;

  let merged = mergeWorkspacePrefsPatch(local, remoteClean);
  let repaired = false;

  if (typeof window !== "undefined") {
    try {
      const sessionDirty = sessionStorage.getItem(WORKSPACE_TZ_DIRTY_SESSION_KEY) === "1";
      const pendingSync = localStorage.getItem(WORKSPACE_TZ_PENDING_SYNC_KEY) === "1";
      if (
        (sessionDirty || pendingSync) &&
        meaningfulString(local.workspaceTimezone)
      ) {
        merged = mergeWorkspacePrefsPatch(merged, {
          workspaceTimezone: local.workspaceTimezone,
          ...(meaningfulString(local.workspaceRegionKey)
            ? { workspaceRegionKey: local.workspaceRegionKey }
            : {}),
        });
        repaired = true;
        if (sessionDirty) sessionStorage.removeItem(WORKSPACE_TZ_DIRTY_SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  }

  const restoreIfEmptied = (k: keyof WorkspacePrefsV1) => {
    const before = local[k];
    const after = merged[k];
    if (meaningfulString(before) && !meaningfulString(after)) {
      merged = mergeWorkspacePrefsPatch(merged, { [k]: before } as Partial<WorkspacePrefsV1>);
      repaired = true;
    }
  };

  restoreIfEmptied("workspaceTimezone");
  restoreIfEmptied("workspaceRegionKey");
  restoreIfEmptied("dashboardCompanyNote");
  restoreIfEmptied("extractionProviderId");
  restoreIfEmptied("llmProviderId");

  if (local.uiLocale && !merged.uiLocale) {
    merged = mergeWorkspacePrefsPatch(merged, { uiLocale: local.uiLocale });
    repaired = true;
  }

  return { merged, repaired };
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

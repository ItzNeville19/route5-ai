"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import {
  clearWorkspaceTzPendingSync,
  loadWorkspacePrefs,
  mergeRemoteWorkspacePrefs,
  mergeWorkspacePrefsPatch,
  saveWorkspacePrefs,
  WORKSPACE_TZ_PENDING_SYNC_KEY,
  type WorkspacePrefsV1,
} from "@/lib/workspace-prefs";
import {
  isLightWorkspacePalette,
  resolveWorkspaceTheme,
} from "@/lib/workspace-themes";
import { resolveWorkspaceSurfaceMaterial } from "@/lib/workspace-surface-material";
import { MARKETPLACE_INSTALL_TO_EXTRACTION } from "@/lib/ai-provider-presets";

type ToastItem = {
  id: string;
  message: string;
  tone: "info" | "success" | "error";
};

type WorkspaceExperienceValue = {
  prefs: WorkspacePrefsV1;
  setPrefs: (patch: Partial<WorkspacePrefsV1>) => void;
  togglePinProject: (projectId: string) => void;
  isProjectPinned: (projectId: string) => boolean;
  toggleMarketplaceFavorite: (appId: string) => void;
  isMarketplaceFavorite: (appId: string) => boolean;
  installMarketplaceApp: (appId: string) => void;
  isMarketplaceInstalled: (appId: string) => boolean;
  shellModifierClass: string;
  /** Same condition as `workspace-palette-light` on the shell — frosted light UI vs dark command glass. */
  workspacePaletteLight: boolean;
  pushToast: (message: string, tone?: ToastItem["tone"]) => void;
};

const WorkspaceExperienceContext = createContext<WorkspaceExperienceValue | null>(
  null
);

export function useWorkspaceExperience(): WorkspaceExperienceValue {
  const v = useContext(WorkspaceExperienceContext);
  if (!v) {
    throw new Error("useWorkspaceExperience must be used inside WorkspaceExperienceProvider");
  }
  return v;
}

export function WorkspaceExperienceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefsState] = useState<WorkspacePrefsV1>(() => loadWorkspacePrefs());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [remoteReady, setRemoteReady] = useState(false);
  const appearanceTick = useAlignedMinuteTick();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/workspace/prefs", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { prefs?: WorkspacePrefsV1 } | null) => {
        if (cancelled || !data?.prefs || typeof data.prefs !== "object") return;
        const remote = { ...(data.prefs as WorkspacePrefsV1) };
        delete remote.sidebarHidden;
        setPrefsState((prev) => {
          const { merged } = mergeRemoteWorkspacePrefs(prev, remote);
          return merged;
        });
      })
      .finally(() => {
        if (!cancelled) setRemoteReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveWorkspacePrefs(prefs);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("route5:workspace-prefs-changed"));
    }
  }, [prefs]);

  useEffect(() => {
    if (!remoteReady) return;
    const t = window.setTimeout(() => {
      void fetch("/api/workspace/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ prefs }),
      }).then((r) => {
        if (r.ok) clearWorkspaceTzPendingSync();
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [prefs, remoteReady]);

  const flushWorkspaceTzToServer = useCallback((snapshot: WorkspacePrefsV1) => {
    void fetch("/api/workspace/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        prefs: {
          workspaceTimezone: snapshot.workspaceTimezone,
          workspaceRegionKey: snapshot.workspaceRegionKey,
        },
      }),
    }).then((r) => {
      if (r.ok) clearWorkspaceTzPendingSync();
    });
  }, []);

  /** TZ/region POST as soon as the account is ready — avoids refresh before the 900ms debounce. */
  useEffect(() => {
    if (!remoteReady) return;
    let pending = false;
    try {
      pending = localStorage.getItem(WORKSPACE_TZ_PENDING_SYNC_KEY) === "1";
    } catch {
      return;
    }
    if (!pending) return;
    flushWorkspaceTzToServer(prefs);
  }, [remoteReady, prefs, flushWorkspaceTzToServer]);

  const setPrefs = useCallback((patch: Partial<WorkspacePrefsV1>) => {
    setPrefsState((prev) => {
      const next = mergeWorkspacePrefsPatch(prev, patch);
      const tzTouch =
        patch.workspaceTimezone !== undefined || patch.workspaceRegionKey !== undefined;
      if (tzTouch && typeof window !== "undefined") {
        try {
          localStorage.setItem(WORKSPACE_TZ_PENDING_SYNC_KEY, "1");
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, []);

  const togglePinProject = useCallback((projectId: string) => {
    setPrefsState((prev) => {
      const pins = new Set(prev.pinnedProjectIds ?? []);
      if (pins.has(projectId)) pins.delete(projectId);
      else pins.add(projectId);
      return { ...prev, pinnedProjectIds: [...pins] };
    });
  }, []);

  const isProjectPinned = useCallback(
    (projectId: string) => Boolean(prefs.pinnedProjectIds?.includes(projectId)),
    [prefs.pinnedProjectIds]
  );

  const toggleMarketplaceFavorite = useCallback((appId: string) => {
    setPrefsState((prev) => {
      const fav = new Set(prev.marketplaceFavorites ?? []);
      if (fav.has(appId)) fav.delete(appId);
      else fav.add(appId);
      return { ...prev, marketplaceFavorites: [...fav] };
    });
  }, []);

  const isMarketplaceFavorite = useCallback(
    (appId: string) => Boolean(prefs.marketplaceFavorites?.includes(appId)),
    [prefs.marketplaceFavorites]
  );

  const installMarketplaceApp = useCallback((appId: string) => {
    setPrefsState((prev) => {
      const cur = new Set(prev.installedMarketplaceAppIds ?? []);
      cur.add(appId);
      const extractionSync = MARKETPLACE_INSTALL_TO_EXTRACTION[appId];
      return mergeWorkspacePrefsPatch(prev, {
        installedMarketplaceAppIds: [...cur],
        ...(extractionSync ? { extractionProviderId: extractionSync } : {}),
      });
    });
  }, []);

  const isMarketplaceInstalled = useCallback(
    (appId: string) => Boolean(prefs.installedMarketplaceAppIds?.includes(appId)),
    [prefs.installedMarketplaceAppIds]
  );

  const pushToast = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const workspaceTheme = useMemo(
    () => resolveWorkspaceTheme(prefs, appearanceTick),
    [prefs, appearanceTick]
  );

  const workspacePaletteLight = isLightWorkspacePalette(workspaceTheme.resolvedId);

  const shellModifierClass = useMemo(() => {
    const parts: string[] = [];
    if (prefs.compact) parts.push("workspace-compact");
    if (prefs.focusMode) parts.push("workspace-focus");
    if (prefs.sidebarHidden) parts.push("workspace-sidebar-hidden");
    parts.push(workspaceTheme.cssClass);
    if (workspacePaletteLight) {
      parts.push("workspace-palette-light");
    }
    if (prefs.appearanceGradients === false) parts.push("workspace-no-gradients");
    parts.push(
      `workspace-surface-${resolveWorkspaceSurfaceMaterial(prefs.surfaceMaterial)}`
    );
    return parts.join(" ");
  }, [
    prefs.compact,
    prefs.focusMode,
    prefs.sidebarHidden,
    prefs.appearanceGradients,
    prefs.surfaceMaterial,
    workspaceTheme.cssClass,
    workspacePaletteLight,
  ]);

  const value = useMemo(
    () => ({
      prefs,
      setPrefs,
      togglePinProject,
      isProjectPinned,
      toggleMarketplaceFavorite,
      isMarketplaceFavorite,
      installMarketplaceApp,
      isMarketplaceInstalled,
      shellModifierClass,
      workspacePaletteLight,
      pushToast,
    }),
    [
      prefs,
      setPrefs,
      togglePinProject,
      isProjectPinned,
      toggleMarketplaceFavorite,
      isMarketplaceFavorite,
      installMarketplaceApp,
      isMarketplaceInstalled,
      shellModifierClass,
      workspacePaletteLight,
      pushToast,
    ]
  );

  return (
    <WorkspaceExperienceContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed bottom-4 right-4 z-[100000] flex max-w-sm flex-col gap-2"
              aria-live="polite"
            >
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] font-medium shadow-lg backdrop-blur-md ${
                    t.tone === "error"
                      ? "border-red-200/80 bg-red-50/95 text-red-950"
                      : t.tone === "success"
                        ? "border-indigo-200/80 bg-indigo-50/95 text-indigo-950"
                        : "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/95 text-[var(--workspace-fg)]"
                  }`}
                >
                  <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
                  <button
                    type="button"
                    onClick={() => dismissToast(t.id)}
                    className="shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </WorkspaceExperienceContext.Provider>
  );
}

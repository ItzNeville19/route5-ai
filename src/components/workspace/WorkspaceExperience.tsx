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
import {
  loadWorkspacePrefs,
  saveWorkspacePrefs,
  type WorkspacePrefsV1,
} from "@/lib/workspace-prefs";

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

function mergePrefs(
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
    next.dashboardAiShortcuts = [...patch.dashboardAiShortcuts];
  }
  return next;
}

export function WorkspaceExperienceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefsState] = useState<WorkspacePrefsV1>(() => loadWorkspacePrefs());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/workspace/prefs", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { prefs?: WorkspacePrefsV1 } | null) => {
        if (cancelled || !data?.prefs || typeof data.prefs !== "object") return;
        setPrefsState((prev) => mergePrefs(prev, data.prefs as WorkspacePrefsV1));
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
  }, [prefs]);

  useEffect(() => {
    if (!remoteReady) return;
    const t = window.setTimeout(() => {
      void fetch("/api/workspace/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ prefs }),
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [prefs, remoteReady]);

  const setPrefs = useCallback((patch: Partial<WorkspacePrefsV1>) => {
    setPrefsState((prev) => mergePrefs(prev, patch));
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
      return { ...prev, installedMarketplaceAppIds: [...cur] };
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

  const shellModifierClass = useMemo(() => {
    const parts: string[] = [];
    if (prefs.compact) parts.push("workspace-compact");
    if (prefs.focusMode) parts.push("workspace-focus");
    if (prefs.sidebarCollapsed) parts.push("workspace-sidebar-collapsed");
    return parts.join(" ");
  }, [prefs.compact, prefs.focusMode, prefs.sidebarCollapsed]);

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

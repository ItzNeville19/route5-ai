"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Project } from "@/lib/types";
import {
  computeActivityStats,
  emptyActivitySeries,
  emptyExecutionMetrics,
} from "@/lib/workspace-activity-stats";
import type {
  ActivitySeriesByRange,
  OpenActionRef,
  RecentExtractionRow,
  WorkspaceActivityStats,
  WorkspaceConnectorReadiness,
  WorkspaceExecutionMetrics,
} from "@/lib/workspace-summary";
import {
  getFeaturesForTier,
  getLimitsForTier,
  isPaidTier,
  tierTaglineForTier,
  type EntitlementsPayload,
} from "@/lib/entitlements";
import type { ExecutionOverview } from "@/lib/commitment-types";
import { emptyExecutionOverview } from "@/lib/execution-overview";
import { defaultOrgUiPolicy, parseOrgUiPolicy, type OrgUiPolicy } from "@/lib/org-ui-policy";

type WorkspaceSummaryState = {
  projectCount: number;
  extractionCount: number;
  recent: RecentExtractionRow[];
  openActions: OpenActionRef[];
  activity: WorkspaceActivityStats;
  activitySeries: ActivitySeriesByRange;
  execution: WorkspaceExecutionMetrics;
  readiness: WorkspaceConnectorReadiness | null;
};

type WorkspaceDataValue = {
  projects: Project[];
  summary: WorkspaceSummaryState;
  /** Commitment engine aggregates — same payload as GET /api/workspace/execution. */
  executionOverview: ExecutionOverview | null;
  orgRole: "admin" | "manager" | "member" | null;
  orgUiPolicy: OrgUiPolicy;
  entitlements: EntitlementsPayload | null;
  loadingProjects: boolean;
  loadingSummary: boolean;
  loadingOrganization: boolean;
  loadingEntitlements: boolean;
  refreshProjects: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  refreshEntitlements: () => Promise<void>;
  refreshAll: () => Promise<void>;
  getProjectById: (projectId: string) => Project | undefined;
};

const EMPTY_SUMMARY: WorkspaceSummaryState = {
  projectCount: 0,
  extractionCount: 0,
  recent: [],
  openActions: [],
  activity: computeActivityStats([]),
  activitySeries: emptyActivitySeries(),
  execution: emptyExecutionMetrics(),
  readiness: null,
};

const WorkspaceDataContext = createContext<WorkspaceDataValue | null>(null);
const ACTIVE_PROJECT_STORAGE_KEY = "route5.headerProjectId";

function readScopedProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

function clearScopedProjectId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("route5:project-scope-changed", { detail: { projectId: null } }));
  } catch {
    /* ignore */
  }
}

export function useWorkspaceData(): WorkspaceDataValue {
  const value = useContext(WorkspaceDataContext);
  if (!value) {
    throw new Error("useWorkspaceData must be used inside WorkspaceDataProvider");
  }
  return value;
}

/** Root layout surfaces (e.g. command palette) render outside `WorkspaceDataProvider` on marketing routes. */
export function useWorkspaceDataOptional(): WorkspaceDataValue | null {
  return useContext(WorkspaceDataContext);
}

export function WorkspaceDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<WorkspaceSummaryState>(EMPTY_SUMMARY);
  const [executionOverview, setExecutionOverview] = useState<ExecutionOverview | null>(null);
  const [orgRole, setOrgRole] = useState<"admin" | "manager" | "member" | null>(null);
  const [orgUiPolicy, setOrgUiPolicy] = useState<OrgUiPolicy>(() => defaultOrgUiPolicy());
  const [entitlements, setEntitlements] = useState<EntitlementsPayload | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOrganization, setLoadingOrganization] = useState(true);
  const [loadingEntitlements, setLoadingEntitlements] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        projects?: Project[];
      };
      if (!res.ok) return;
      const next = data.projects ?? [];
      setProjects(next);
      const scoped = readScopedProjectId();
      if (scoped && !next.some((p) => p.id === scoped)) {
        clearScopedProjectId();
      }
    } catch {
      /* keep previous projects on transient network errors */
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const refreshEntitlements = useCallback(async () => {
    setLoadingEntitlements(true);
    try {
      const res = await fetch("/api/workspace/entitlements", {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as EntitlementsPayload & { error?: string };
      if (!res.ok) {
        setEntitlements(null);
        return;
      }
      const tier = data.tier ?? "free";
      setEntitlements({
        tier,
        tierLabel: data.tierLabel,
        tierTagline: data.tierTagline ?? tierTaglineForTier(tier),
        isPaidTier: data.isPaidTier ?? isPaidTier(tier),
        features: data.features ?? getFeaturesForTier(tier),
        limits: data.limits ?? getLimitsForTier(tier),
        usage: {
          projectCount: data.usage?.projectCount ?? 0,
          extractionCount: data.usage?.extractionCount ?? 0,
          extractionsThisMonth: data.usage?.extractionsThisMonth ?? 0,
        },
      });
    } catch {
      setEntitlements(null);
    } finally {
      setLoadingEntitlements(false);
    }
  }, []);

  const refreshOrganization = useCallback(async () => {
    setLoadingOrganization(true);
    try {
      const res = await fetch("/api/workspace/organization", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        me?: { role?: string | null };
        uiPolicy?: unknown;
      };
      if (!res.ok) {
        setOrgRole(null);
        setOrgUiPolicy(defaultOrgUiPolicy());
        return;
      }
      setOrgUiPolicy(parseOrgUiPolicy(data.uiPolicy));
      const role = data.me?.role;
      if (role === "admin" || role === "manager" || role === "member") {
        setOrgRole(role);
      } else {
        setOrgRole(null);
      }
    } catch {
      setOrgRole(null);
      setOrgUiPolicy(defaultOrgUiPolicy());
    } finally {
      setLoadingOrganization(false);
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams();
      if (activeProjectId) params.set("projectId", activeProjectId);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const [sumRes, execRes] = await Promise.all([
        fetch(`/api/workspace/summary${suffix}`, { credentials: "same-origin" }),
        fetch(`/api/workspace/execution${suffix}`, { credentials: "same-origin" }),
      ]);

      const execJson = (await execRes.json().catch(() => ({}))) as {
        overview?: ExecutionOverview;
        error?: string;
      };
      if (execRes.ok) {
        setExecutionOverview(execJson.overview ?? emptyExecutionOverview());
      } else {
        setExecutionOverview(emptyExecutionOverview());
      }

      const data = (await sumRes.json().catch(() => ({}))) as {
        projectCount?: number;
        extractionCount?: number;
        recent?: RecentExtractionRow[];
        openActions?: OpenActionRef[];
        activity?: WorkspaceActivityStats;
        activitySeries?: ActivitySeriesByRange;
        execution?: WorkspaceExecutionMetrics;
        readiness?: Partial<WorkspaceConnectorReadiness> & Record<string, unknown>;
      };
      if (!sumRes.ok) {
        setSummary(EMPTY_SUMMARY);
        setExecutionOverview(null);
        return;
      }
      const r = data.readiness;
      const readiness: WorkspaceConnectorReadiness | null = r
        ? {
            openai: Boolean(r.openai),
            linear: Boolean(r.linear),
            github: Boolean(r.github),
            figma: Boolean(r.figma),
          }
        : null;
      setSummary({
        projectCount: data.projectCount ?? 0,
        extractionCount: data.extractionCount ?? 0,
        recent: data.recent ?? [],
        openActions: data.openActions ?? [],
        activity: data.activity ?? computeActivityStats([]),
        activitySeries: data.activitySeries ?? emptyActivitySeries(),
        execution: data.execution ?? emptyExecutionMetrics(),
        readiness,
      });
    } catch {
      setSummary(EMPTY_SUMMARY);
      setExecutionOverview(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [activeProjectId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProjects(), refreshSummary(), refreshOrganization(), refreshEntitlements()]);
  }, [refreshProjects, refreshSummary, refreshOrganization, refreshEntitlements]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onRefresh = () => void refreshAll();
    window.addEventListener("route5:project-updated", onRefresh);
    return () => window.removeEventListener("route5:project-updated", onRefresh);
  }, [refreshAll]);

  useEffect(() => {
    const applyScope = () => setActiveProjectId(readScopedProjectId());
    applyScope();
    const onScopeChanged = () => applyScope();
    window.addEventListener("route5:project-scope-changed", onScopeChanged);
    window.addEventListener("storage", onScopeChanged);
    return () => {
      window.removeEventListener("route5:project-scope-changed", onScopeChanged);
      window.removeEventListener("storage", onScopeChanged);
    };
  }, []);

  const getProjectById = useCallback(
    (projectId: string) => projects.find((project) => project.id === projectId),
    [projects]
  );

  const value = useMemo(
    () => ({
      projects,
      summary,
      executionOverview,
      orgRole,
      orgUiPolicy,
      entitlements,
      loadingProjects,
      loadingSummary,
      loadingOrganization,
      loadingEntitlements,
      refreshProjects,
      refreshSummary,
      refreshOrganization,
      refreshEntitlements,
      refreshAll,
      getProjectById,
    }),
    [
      projects,
      summary,
      executionOverview,
      orgRole,
      orgUiPolicy,
      entitlements,
      loadingProjects,
      loadingSummary,
      loadingOrganization,
      loadingEntitlements,
      refreshProjects,
      refreshSummary,
      refreshOrganization,
      refreshEntitlements,
      refreshAll,
      getProjectById,
    ]
  );

  return (
    <WorkspaceDataContext.Provider value={value}>
      {children}
    </WorkspaceDataContext.Provider>
  );
}

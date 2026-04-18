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
  entitlements: EntitlementsPayload | null;
  loadingProjects: boolean;
  loadingSummary: boolean;
  loadingEntitlements: boolean;
  refreshProjects: () => Promise<void>;
  refreshSummary: () => Promise<void>;
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

export function useWorkspaceData(): WorkspaceDataValue {
  const value = useContext(WorkspaceDataContext);
  if (!value) {
    throw new Error("useWorkspaceData must be used inside WorkspaceDataProvider");
  }
  return value;
}

export function WorkspaceDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<WorkspaceSummaryState>(EMPTY_SUMMARY);
  const [executionOverview, setExecutionOverview] = useState<ExecutionOverview | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsPayload | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingEntitlements, setLoadingEntitlements] = useState(true);

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        projects?: Project[];
      };
      setProjects(res.ok ? (data.projects ?? []) : []);
    } catch {
      setProjects([]);
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

  const refreshSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const [sumRes, execRes] = await Promise.all([
        fetch("/api/workspace/summary", { credentials: "same-origin" }),
        fetch("/api/workspace/execution", { credentials: "same-origin" }),
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
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProjects(), refreshSummary(), refreshEntitlements()]);
  }, [refreshProjects, refreshSummary, refreshEntitlements]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onRefresh = () => void refreshAll();
    window.addEventListener("route5:project-updated", onRefresh);
    return () => window.removeEventListener("route5:project-updated", onRefresh);
  }, [refreshAll]);

  const getProjectById = useCallback(
    (projectId: string) => projects.find((project) => project.id === projectId),
    [projects]
  );

  const value = useMemo(
    () => ({
      projects,
      summary,
      executionOverview,
      entitlements,
      loadingProjects,
      loadingSummary,
      loadingEntitlements,
      refreshProjects,
      refreshSummary,
      refreshEntitlements,
      refreshAll,
      getProjectById,
    }),
    [
      projects,
      summary,
      executionOverview,
      entitlements,
      loadingProjects,
      loadingSummary,
      loadingEntitlements,
      refreshProjects,
      refreshSummary,
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

/** Connector env flags returned with workspace summary (no secrets). */
export type WorkspaceConnectorReadiness = {
  openai: boolean;
  linear: boolean;
  github: boolean;
  figma: boolean;
};

export type RecentExtractionRow = {
  id: string;
  projectId: string;
  projectName: string;
  summarySnippet: string;
  createdAt: string;
  /** Incomplete actions on this run */
  openActionsCount: number;
};

/** One incomplete action, for workspace-wide follow-through (Desk queue). */
export type OpenActionRef = {
  actionId: string;
  text: string;
  projectId: string;
  projectName: string;
  extractionId: string;
  extractionCreatedAt: string;
};

export type {
  ActivitySeriesByRange,
  ChartTimeRange,
  WorkspaceActivityStats,
  WorkspaceExecutionMetrics,
} from "@/lib/workspace-activity-stats";

/** Org-level commitment tracker (Phase 6) — distinct from execution-layer `Commitment` (project-scoped). */

export type OrgCommitmentPriority = "critical" | "high" | "medium" | "low";

export type OrgCommitmentStatus =
  | "not_started"
  | "in_progress"
  | "on_track"
  | "at_risk"
  | "overdue"
  | "completed";

export type OrgCommitmentRow = {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  ownerId: string;
  /** Optional workspace project this commitment belongs to. */
  projectId: string | null;
  deadline: string;
  priority: OrgCommitmentPriority;
  status: OrgCommitmentStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastActivityAt: string;
  deletedAt: string | null;
};

export type OrgCommitmentComment = {
  id: string;
  commitmentId: string;
  userId: string;
  content: string;
  createdAt: string;
};

export type OrgCommitmentAttachment = {
  id: string;
  commitmentId: string;
  userId: string;
  fileName: string;
  /** Storage path (Supabase) or download token for SQLite. */
  fileUrl: string;
  createdAt: string;
};

export type OrgCommitmentHistoryEntry = {
  id: string;
  commitmentId: string;
  changedBy: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
};

export type OrgCommitmentDependency = {
  id: string;
  commitmentId: string;
  dependsOnCommitmentId: string;
};

export type OrgCommitmentDetail = OrgCommitmentRow & {
  comments: OrgCommitmentComment[];
  attachments: OrgCommitmentAttachment[];
  history: OrgCommitmentHistoryEntry[];
  dependencies: OrgCommitmentDependency[];
  /** Resolved titles for dependency targets (same org). */
  dependencyTitles: Record<string, string>;
};

export type OrgCommitmentListSort =
  | "deadline"
  | "priority"
  | "status"
  | "created_at"
  | "updated_at"
  | "owner_id";

/** Core execution entity — system of record for owned commitments (not a generic task list). */

export type CommitmentSource = "meeting" | "slack" | "email" | "manual";

export type CommitmentStatus = "active" | "at_risk" | "overdue" | "completed";

export type CommitmentPriority = "low" | "medium" | "high";

export type CommitmentActivityEntry = {
  id: string;
  at: string;
  kind: "note" | "status" | "owner" | "system";
  body: string;
  actorUserId?: string | null;
};

export type Commitment = {
  id: string;
  projectId: string;
  clerkUserId: string;
  title: string;
  description: string | null;
  /** When set, commitment is assigned to this Clerk user. */
  ownerUserId: string | null;
  /** Label from extraction or manual display when no Clerk mapping. */
  ownerDisplayName: string | null;
  source: CommitmentSource;
  sourceReference: string;
  status: CommitmentStatus;
  priority: CommitmentPriority;
  createdAt: string;
  dueDate: string | null;
  lastUpdatedAt: string;
  activityLog: CommitmentActivityEntry[];
  /** When set, hidden from Desk/Overview active lists; retained for audit. */
  archivedAt: string | null;
};

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/** Risk / dashboard row with project context */
export type CommitmentRiskItem = Commitment & {
  projectName: string;
  riskReason: "unassigned" | "overdue" | "stalled";
  urgencyScore: number;
};

export type TeamLoadEntry = {
  key: string;
  label: string;
  ownerUserId: string | null;
  activeCount: number;
  overloaded: boolean;
};

export type ExecutionOverview = {
  summary: {
    activeTotal: number;
    pctCompletedThisWeek: number;
    atRiskCount: number;
    overdueCount: number;
    /** Open commitments with no owner (Clerk or display name). */
    unassignedCount: number;
  };
  riskFeed: CommitmentRiskItem[];
  teamLoad: TeamLoadEntry[];
  recentActivity: {
    commitmentId: string;
    projectId: string;
    projectName: string;
    title: string;
    at: string;
    body: string;
  }[];
  conflictingDeadlines: {
    ownerLabel: string;
    dueDate: string;
    titles: string[];
  }[];
};

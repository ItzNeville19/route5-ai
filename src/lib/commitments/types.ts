export type CommitmentStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "blocked"
  | "done"
  | "reopened";

export type CommitmentSource = "meeting" | "email" | "slack" | "manual";

export type CommitmentEventType =
  | "created"
  | "assigned"
  | "accepted"
  | "updated"
  | "blocked"
  | "due_date_requested"
  | "due_date_approved"
  | "due_date_rejected"
  | "completed"
  | "approved"
  | "reopened";

export type CommitmentEvent = {
  id: string;
  type: CommitmentEventType;
  at: string;
  actor: string;
  note?: string | null;
};

export type Commitment = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  owner: string | null;
  status: CommitmentStatus;
  source: CommitmentSource;
  blockerReason: string | null;
  dueDateRequest: {
    requestedDate: string;
    reason: string | null;
    status: "pending" | "approved" | "rejected";
    reviewedAt?: string | null;
    reviewerComment?: string | null;
  } | null;
  completion: {
    note: string | null;
    proofUrl: string | null;
    status: "none" | "submitted" | "approved";
    managerComment: string | null;
  };
  acknowledgedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  activityTimeline: CommitmentEvent[];
};

export type CommitmentCreatePayload = {
  projectId: string;
  title: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  source?: CommitmentSource;
  dueDate?: string | null;
};

export type CommitmentUpdatePayload = {
  title?: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  blockerReason?: string | null;
  completionNote?: string | null;
  completionProofUrl?: string | null;
  managerDecision?: "approve" | "reopen" | null;
  managerComment?: string | null;
  dueDateRequest?: {
    requestedDate: string;
    reason?: string | null;
  } | null;
  dueDateRequestDecision?: {
    action: "approve" | "reject";
    comment?: string | null;
  } | null;
  dueDate?: string | null;
};

import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { listProjectsForUser, verifyProjectOwned } from "@/lib/workspace/store";

export type CommitmentStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "blocked"
  | "done"
  | "reopened";
type BaseDbStatus = "pending" | "in_progress" | "done";
type DueDateRequestDecision = { action: "approve" | "reject"; comment?: string | null };
type DueDateRequestPayload = { requestedDate: string; reason?: string | null };
type ManagerDecision = "approve" | "reopen";
type CommitmentSource = "meeting" | "email" | "slack" | "manual";

type ActivityEvent = {
  id: string;
  type:
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
  at: string;
  actor: string;
  note?: string | null;
};

type CommitmentMeta = {
  workflowStatus: CommitmentStatus;
  blockerReason: string | null;
  acknowledgedAt: string | null;
  completion: {
    note: string | null;
    proofUrl: string | null;
    status: "none" | "submitted" | "approved";
    managerComment: string | null;
  };
  dueDateRequest: {
    requestedDate: string;
    reason: string | null;
    status: "pending" | "approved" | "rejected";
    reviewedAt?: string | null;
    reviewerComment?: string | null;
  } | null;
};

export type CommitmentRecord = {
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
  activityTimeline: ActivityEvent[];
};

export type CommitmentCreateInput = {
  projectId: string;
  title: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  source?: CommitmentSource;
  dueDate?: string | null;
};

export type CommitmentUpdateInput = {
  title?: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  blockerReason?: string | null;
  completionNote?: string | null;
  completionProofUrl?: string | null;
  managerDecision?: ManagerDecision | null;
  managerComment?: string | null;
  dueDateRequest?: DueDateRequestPayload | null;
  dueDateRequestDecision?: DueDateRequestDecision | null;
  dueDate?: string | null;
};

type DbRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  owner?: string | null;
  owner_display_name: string | null;
  owner_user_id: string | null;
  source: string | null;
  status: string;
  due_date: string | null;
  activity_log: unknown[] | null;
  created_at: string;
  updated_at?: string | null;
  last_updated_at?: string | null;
};

function requireSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required for commitments.");
  }
}

function toBaseStatus(raw: string): BaseDbStatus {
  if (raw === "done" || raw === "pending" || raw === "in_progress") return raw;
  if (raw === "completed") return "done";
  return "in_progress";
}

function baseFromWorkflow(status: CommitmentStatus): BaseDbStatus {
  if (status === "done") return "done";
  if (status === "blocked" || status === "in_progress") return "in_progress";
  return "pending";
}

function normalizeSource(raw: string | null | undefined): CommitmentSource {
  if (raw === "meeting" || raw === "email" || raw === "slack" || raw === "manual") return raw;
  return "manual";
}

function baseMeta(status: BaseDbStatus): CommitmentMeta {
  return {
    workflowStatus: status === "done" ? "done" : status === "in_progress" ? "in_progress" : "pending",
    blockerReason: null,
    acknowledgedAt: null,
    completion: {
      note: null,
      proofUrl: null,
      status: status === "done" ? "submitted" : "none",
      managerComment: null,
    },
    dueDateRequest: null,
  };
}

function readMetaFromActivityLog(activityLog: unknown[] | null | undefined, dbStatus: BaseDbStatus): CommitmentMeta {
  const fallback = baseMeta(dbStatus);
  if (!Array.isArray(activityLog)) return fallback;
  const state = activityLog
    .slice()
    .reverse()
    .find((entry) => typeof entry === "object" && entry !== null && (entry as { kind?: string }).kind === "state_snapshot");
  if (!state || typeof state !== "object") return fallback;
  const maybe = (state as { data?: Partial<CommitmentMeta> }).data;
  if (!maybe) return fallback;
  return {
    workflowStatus:
      maybe.workflowStatus === "pending" ||
      maybe.workflowStatus === "accepted" ||
      maybe.workflowStatus === "in_progress" ||
      maybe.workflowStatus === "blocked" ||
      maybe.workflowStatus === "done" ||
      maybe.workflowStatus === "reopened"
        ? maybe.workflowStatus
        : fallback.workflowStatus,
    blockerReason: maybe.blockerReason ?? null,
    acknowledgedAt: maybe.acknowledgedAt ?? null,
    completion: {
      note: maybe.completion?.note ?? null,
      proofUrl: maybe.completion?.proofUrl ?? null,
      status:
        maybe.completion?.status === "none" ||
        maybe.completion?.status === "submitted" ||
        maybe.completion?.status === "approved"
          ? maybe.completion.status
          : fallback.completion.status,
      managerComment: maybe.completion?.managerComment ?? null,
    },
    dueDateRequest: maybe.dueDateRequest
      ? {
          requestedDate: maybe.dueDateRequest.requestedDate ?? "",
          reason: maybe.dueDateRequest.reason ?? null,
          status:
            maybe.dueDateRequest.status === "pending" ||
            maybe.dueDateRequest.status === "approved" ||
            maybe.dueDateRequest.status === "rejected"
              ? maybe.dueDateRequest.status
              : "pending",
          reviewedAt: maybe.dueDateRequest.reviewedAt ?? null,
          reviewerComment: maybe.dueDateRequest.reviewerComment ?? null,
        }
      : null,
  };
}

function readTimelineFromActivityLog(activityLog: unknown[] | null | undefined): ActivityEvent[] {
  if (!Array.isArray(activityLog)) return [];
  return activityLog
    .filter((entry) => typeof entry === "object" && entry !== null && (entry as { kind?: string }).kind === "event")
    .map((entry) => (entry as { data?: ActivityEvent }).data)
    .filter((event): event is ActivityEvent => Boolean(event && event.type && event.at))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function mapRow(row: DbRow): CommitmentRecord {
  const dbStatus = toBaseStatus(row.status);
  const meta = readMetaFromActivityLog(row.activity_log, dbStatus);
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    owner: row.owner ?? row.owner_display_name ?? row.owner_user_id ?? null,
    status: meta.workflowStatus,
    source: normalizeSource(row.source),
    blockerReason: meta.blockerReason,
    dueDateRequest: meta.dueDateRequest,
    completion: meta.completion,
    acknowledgedAt: meta.acknowledgedAt,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.last_updated_at ?? row.created_at,
    activityTimeline: readTimelineFromActivityLog(row.activity_log),
  };
}

function appendTimelineEvent(activityLog: unknown[] | null | undefined, event: ActivityEvent): unknown[] {
  const list = Array.isArray(activityLog) ? [...activityLog] : [];
  list.push({ kind: "event", data: event });
  return list;
}

function appendStateSnapshot(activityLog: unknown[] | null | undefined, meta: CommitmentMeta): unknown[] {
  const list = Array.isArray(activityLog) ? [...activityLog] : [];
  list.push({ kind: "state_snapshot", data: meta });
  return list;
}

async function allowedProjectIds(userId: string): Promise<string[]> {
  const projects = await listProjectsForUser(userId);
  return projects.map((p) => p.id);
}

export async function fetchCommitments(
  userId: string,
  filters?: { projectId?: string; status?: CommitmentStatus | "active" }
): Promise<CommitmentRecord[]> {
  requireSupabaseConfigured();
  const projectIds = await allowedProjectIds(userId);
  if (projectIds.length === 0) return [];
  if (filters?.projectId && !projectIds.includes(filters.projectId)) return [];

  const supabase = getServiceClient();
  let query = supabase
    .from("commitments")
    .select(
      "id, project_id, title, description, owner_display_name, owner_user_id, source, status, due_date, activity_log, created_at, last_updated_at"
    )
    .in("project_id", filters?.projectId ? [filters.projectId] : projectIds)
    .is("archived_at", null)
    .order("last_updated_at", { ascending: false, nullsFirst: false });

  if (filters?.status === "active") {
    query = query.neq("status", "done");
  }
  const { data, error } = await query;
  if (error) throw error;
  const mapped = (data ?? []).map((row) => mapRow(row as DbRow));
  if (filters?.status && filters.status !== "active") {
    return mapped.filter((row) => row.status === filters.status);
  }
  return mapped;
}

export async function createCommitment(
  userId: string,
  input: CommitmentCreateInput
): Promise<CommitmentRecord> {
  requireSupabaseConfigured();
  const access = await verifyProjectOwned(userId, input.projectId);
  if (!access) throw new Error("FORBIDDEN");
  const now = new Date().toISOString();
  const workflowStatus: CommitmentStatus = input.status ?? "pending";
  const timelineEvent: ActivityEvent = {
    id: crypto.randomUUID(),
    type: "created",
    at: now,
    actor: userId,
    note: "Commitment created",
  };
  const stateMeta: CommitmentMeta = {
    workflowStatus,
    blockerReason: null,
    acknowledgedAt: workflowStatus === "accepted" || workflowStatus === "in_progress" ? now : null,
    completion: {
      note: null,
      proofUrl: null,
      status: workflowStatus === "done" ? "submitted" : "none",
      managerComment: null,
    },
    dueDateRequest: null,
  };
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      project_id: input.projectId,
      clerk_user_id: userId,
      title: input.title.trim(),
      description: input.description ?? null,
      owner_display_name: input.owner?.trim() || null,
      owner_user_id: null,
      source: input.source ?? "manual",
      source_reference: "desk",
      status: baseFromWorkflow(workflowStatus),
      priority: "medium",
      due_date: input.dueDate ?? null,
      last_updated_at: now,
      activity_log: appendStateSnapshot(appendTimelineEvent([], timelineEvent), stateMeta),
      archived_at: null,
    })
    .select(
      "id, project_id, title, description, owner_display_name, owner_user_id, source, status, due_date, activity_log, created_at, last_updated_at"
    )
    .single();
  if (error) throw error;
  return mapRow(data as DbRow);
}

export async function updateCommitment(
  userId: string,
  id: string,
  updates: CommitmentUpdateInput
): Promise<CommitmentRecord | null> {
  requireSupabaseConfigured();
  const projectIds = await allowedProjectIds(userId);
  if (projectIds.length === 0) return null;
  const supabase = getServiceClient();
  const { data: existingRaw, error: existingErr } = await supabase
    .from("commitments")
    .select(
      "id, project_id, title, description, owner_display_name, owner_user_id, source, status, due_date, activity_log, created_at, last_updated_at"
    )
    .eq("id", id)
    .in("project_id", projectIds)
    .is("archived_at", null)
    .maybeSingle();
  if (existingErr) throw existingErr;
  const existing = existingRaw ? mapRow(existingRaw as DbRow) : null;
  if (!existing) return null;
  const existingMeta = readMetaFromActivityLog((existingRaw as DbRow).activity_log, toBaseStatus((existingRaw as DbRow).status));
  const existingLog = (existingRaw as DbRow).activity_log ?? [];
  const now = new Date().toISOString();
  const nextMeta: CommitmentMeta = {
    ...existingMeta,
    completion: { ...existingMeta.completion },
    dueDateRequest: existingMeta.dueDateRequest ? { ...existingMeta.dueDateRequest } : null,
  };
  let workflowStatus: CommitmentStatus = updates.status ?? existing.status;
  const timeline = [...readTimelineFromActivityLog(existingLog)];

  if (updates.owner !== undefined && updates.owner?.trim() && updates.owner.trim() !== (existing.owner ?? "")) {
    timeline.push({
      id: crypto.randomUUID(),
      type: "assigned",
      at: now,
      actor: userId,
      note: `Assigned to ${updates.owner.trim()}`,
    });
  }
  if (updates.status === "accepted" && !nextMeta.acknowledgedAt) {
    nextMeta.acknowledgedAt = now;
    timeline.push({
      id: crypto.randomUUID(),
      type: "accepted",
      at: now,
      actor: userId,
      note: "Ownership acknowledged",
    });
  }
  if (updates.status === "blocked") {
    nextMeta.blockerReason = updates.blockerReason?.trim() || nextMeta.blockerReason || "Blocked";
    timeline.push({
      id: crypto.randomUUID(),
      type: "blocked",
      at: now,
      actor: userId,
      note: nextMeta.blockerReason,
    });
  } else if (updates.blockerReason !== undefined) {
    nextMeta.blockerReason = updates.blockerReason?.trim() || null;
  }
  if (updates.dueDateRequest?.requestedDate) {
    nextMeta.dueDateRequest = {
      requestedDate: updates.dueDateRequest.requestedDate,
      reason: updates.dueDateRequest.reason?.trim() || null,
      status: "pending",
      reviewedAt: null,
      reviewerComment: null,
    };
    timeline.push({
      id: crypto.randomUUID(),
      type: "due_date_requested",
      at: now,
      actor: userId,
      note: nextMeta.dueDateRequest.reason ?? "Due date change requested",
    });
  }
  if (updates.dueDateRequestDecision && nextMeta.dueDateRequest) {
    if (updates.dueDateRequestDecision.action === "approve") {
      nextMeta.dueDateRequest.status = "approved";
      nextMeta.dueDateRequest.reviewedAt = now;
      nextMeta.dueDateRequest.reviewerComment = updates.dueDateRequestDecision.comment?.trim() || null;
      timeline.push({
        id: crypto.randomUUID(),
        type: "due_date_approved",
        at: now,
        actor: userId,
        note: updates.dueDateRequestDecision.comment?.trim() || "Due date change approved",
      });
    } else {
      nextMeta.dueDateRequest.status = "rejected";
      nextMeta.dueDateRequest.reviewedAt = now;
      nextMeta.dueDateRequest.reviewerComment = updates.dueDateRequestDecision.comment?.trim() || null;
      timeline.push({
        id: crypto.randomUUID(),
        type: "due_date_rejected",
        at: now,
        actor: userId,
        note: updates.dueDateRequestDecision.comment?.trim() || "Due date change rejected",
      });
    }
  }
  if (updates.completionNote !== undefined || updates.completionProofUrl !== undefined) {
    nextMeta.completion.note = updates.completionNote?.trim() || nextMeta.completion.note || null;
    nextMeta.completion.proofUrl = updates.completionProofUrl?.trim() || nextMeta.completion.proofUrl || null;
    if (nextMeta.completion.note || nextMeta.completion.proofUrl) {
      nextMeta.completion.status = "submitted";
    }
  }
  if (updates.status === "done") {
    nextMeta.completion.status = "submitted";
    timeline.push({
      id: crypto.randomUUID(),
      type: "completed",
      at: now,
      actor: userId,
      note: nextMeta.completion.note ?? "Completion submitted",
    });
  }
  if (updates.managerDecision === "approve") {
    nextMeta.completion.status = "approved";
    nextMeta.completion.managerComment = updates.managerComment?.trim() || null;
    workflowStatus = "done";
    timeline.push({
      id: crypto.randomUUID(),
      type: "approved",
      at: now,
      actor: userId,
      note: updates.managerComment?.trim() || "Completion approved",
    });
  }
  if (updates.managerDecision === "reopen") {
    nextMeta.completion.status = "none";
    nextMeta.completion.managerComment = updates.managerComment?.trim() || "Reopened by manager";
    workflowStatus = "reopened";
    timeline.push({
      id: crypto.randomUUID(),
      type: "reopened",
      at: now,
      actor: userId,
      note: nextMeta.completion.managerComment,
    });
  }
  if (updates.status === "in_progress" && workflowStatus !== "done") {
    nextMeta.blockerReason = null;
  }
  nextMeta.workflowStatus = workflowStatus;
  timeline.push({
    id: crypto.randomUUID(),
    type: "updated",
    at: now,
    actor: userId,
    note: "Commitment updated",
  });
  let activityLog: unknown[] = [];
  for (const event of timeline) {
    activityLog = appendTimelineEvent(activityLog, event);
  }
  activityLog = appendStateSnapshot(activityLog, nextMeta);

  const { data, error } = await supabase
    .from("commitments")
    .update({
      title: updates.title?.trim() ?? existing.title,
      description:
        updates.description === undefined ? existing.description : updates.description,
      owner_display_name:
        updates.owner === undefined ? existing.owner : updates.owner?.trim() || null,
      status: baseFromWorkflow(workflowStatus),
      due_date: updates.dueDate === undefined ? existing.dueDate : updates.dueDate,
      activity_log: activityLog,
      last_updated_at: now,
    })
    .eq("id", id)
    .eq("project_id", existing.projectId)
    .select(
      "id, project_id, title, description, owner_display_name, owner_user_id, source, status, due_date, activity_log, created_at, last_updated_at"
    )
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as DbRow) : null;
}

export async function deleteCommitment(userId: string, id: string): Promise<boolean> {
  requireSupabaseConfigured();
  const all = await fetchCommitments(userId);
  const existing = all.find((row) => row.id === id);
  if (!existing) return false;
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("commitments")
    .delete()
    .eq("id", id)
    .eq("project_id", existing.projectId);
  if (error) throw error;
  return true;
}

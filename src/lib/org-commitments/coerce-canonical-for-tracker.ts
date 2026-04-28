import type { CommitmentRecord } from "@/lib/commitments/repository";
import type {
  OrgCommitmentDetail,
  OrgCommitmentPriority,
  OrgCommitmentRow,
  OrgCommitmentStatus,
} from "@/lib/org-commitment-types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Clerk-shaped owner id */
function ownerIdFromCanonical(cr: CommitmentRecord): string {
  const o = cr.owner?.trim();
  if (o && (o.startsWith("user_") || o.startsWith("orgmem_"))) return o;
  return "";
}

function workflowToOrgStatus(s: CommitmentRecord["status"]): OrgCommitmentStatus {
  switch (s) {
    case "pending":
    case "reopened":
      return "not_started";
    case "accepted":
    case "in_progress":
      return "in_progress";
    case "blocked":
      return "at_risk";
    case "done":
      return "completed";
    default:
      return "in_progress";
  }
}

function deadlineFromCanonical(cr: CommitmentRecord): string {
  const d = cr.dueDate?.trim();
  return d ?? "";
}

/**
 * `/api/commitments` returns execution-layer {@link CommitmentRecord}s; the org tracker UI expects
 * {@link OrgCommitmentRow} / {@link OrgCommitmentDetail} shapes. Coerce for safe rendering.
 */
export function coerceOrgCommitmentRowFromApi(raw: unknown): OrgCommitmentRow {
  if (isRecord(raw) && typeof raw.ownerId === "string" && typeof raw.deadline === "string") {
    return raw as OrgCommitmentRow;
  }
  const cr = raw as CommitmentRecord;
  const id = typeof cr.id === "string" ? cr.id : "";
  const nowIso = new Date().toISOString();
  const st = workflowToOrgStatus(cr.status);
  const completedAt = cr.status === "done" ? cr.updatedAt ?? nowIso : null;
  return {
    id,
    orgId: typeof (cr as { orgId?: string }).orgId === "string" ? String((cr as { orgId?: string }).orgId) : "",
    title: cr.title ?? "Untitled",
    description: cr.description ?? null,
    ownerId: ownerIdFromCanonical(cr),
    projectId: cr.projectId ?? null,
    deadline: deadlineFromCanonical(cr),
    priority: "medium" as OrgCommitmentPriority,
    status: st,
    createdAt: cr.createdAt ?? nowIso,
    updatedAt: cr.updatedAt ?? cr.createdAt ?? nowIso,
    lastActivityAt: cr.updatedAt ?? cr.createdAt ?? nowIso,
    deletedAt: null,
    completedAt,
  };
}

export function coerceOrgCommitmentDetailFromApi(raw: unknown): OrgCommitmentDetail | null {
  if (!isRecord(raw) || typeof raw.id !== "string") return null;
  const row = coerceOrgCommitmentRowFromApi(raw);
  if (isRecord(raw) && Array.isArray(raw.comments) && Array.isArray(raw.attachments) && Array.isArray(raw.history)) {
    return raw as OrgCommitmentDetail;
  }
  return {
    ...row,
    comments: [],
    attachments: [],
    history: [],
    dependencies: [],
    dependencyTitles: {},
  };
}

import type {
  Commitment,
  CommitmentActivityEntry,
  CommitmentPriority,
  CommitmentSource,
  CommitmentStatus,
} from "@/lib/commitment-types";

/** Match execution-overview risk logic: no touch in 7 days → at risk. */
const STALE_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

const SOURCES: CommitmentSource[] = ["meeting", "slack", "email", "manual"];
const STATUSES: CommitmentStatus[] = ["active", "at_risk", "overdue", "completed"];
const PRIOS: CommitmentPriority[] = ["low", "medium", "high"];

function parseSource(s: string): CommitmentSource {
  return SOURCES.includes(s as CommitmentSource) ? (s as CommitmentSource) : "manual";
}

function parseStatus(s: string): CommitmentStatus {
  return STATUSES.includes(s as CommitmentStatus) ? (s as CommitmentStatus) : "active";
}

function parsePriority(s: string): CommitmentPriority {
  return PRIOS.includes(s as CommitmentPriority) ? (s as CommitmentPriority) : "medium";
}

export function parseActivityLogJson(raw: string): CommitmentActivityEntry[] {
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    const out: CommitmentActivityEntry[] = [];
    for (const item of j) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const at = typeof o.at === "string" ? o.at : "";
      const kind = o.kind === "note" || o.kind === "status" || o.kind === "owner" || o.kind === "system" ? o.kind : "note";
      const body = typeof o.body === "string" ? o.body : "";
      if (!id || !at || !body) continue;
      out.push({
        id,
        at,
        kind,
        body,
        actorUserId:
          o.actorUserId === null || o.actorUserId === undefined
            ? null
            : typeof o.actorUserId === "string"
              ? o.actorUserId
              : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Due date in the past implies overdue unless completed. */
export function effectiveStatus(
  stored: CommitmentStatus,
  dueDate: string | null
): CommitmentStatus {
  if (stored === "completed") return "completed";
  if (dueDate) {
    const t = new Date(dueDate).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return "overdue";
  }
  return stored;
}

function activityLogToString(raw: string | unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return JSON.stringify(raw);
  return "[]";
}

export function mapRowToCommitment(row: {
  id: string;
  project_id: string;
  clerk_user_id: string;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  owner_display_name: string | null;
  source: string;
  source_reference: string;
  status: string;
  priority: string;
  created_at: string;
  due_date: string | null;
  last_updated_at: string;
  activity_log: string | unknown;
  archived_at?: string | null;
}): Commitment {
  const stored = parseStatus(row.status);
  let status = effectiveStatus(stored, row.due_date);
  if (status === "active") {
    const idleMs = Date.now() - new Date(row.last_updated_at).getTime();
    if (idleMs > STALE_INACTIVITY_MS) {
      status = "at_risk";
    }
  }
  const logStr = activityLogToString(row.activity_log);
  const archivedRaw = row.archived_at;
  const archivedAt =
    archivedRaw === null || archivedRaw === undefined
      ? null
      : typeof archivedRaw === "string" && archivedRaw.trim()
        ? archivedRaw
        : null;

  return {
    id: row.id,
    projectId: row.project_id,
    clerkUserId: row.clerk_user_id,
    title: row.title,
    description: row.description,
    ownerUserId: row.owner_user_id,
    ownerDisplayName: row.owner_display_name,
    source: parseSource(row.source),
    sourceReference: row.source_reference ?? "",
    status,
    priority: parsePriority(row.priority),
    createdAt: row.created_at,
    dueDate: row.due_date,
    lastUpdatedAt: row.last_updated_at,
    activityLog: parseActivityLogJson(logStr),
    archivedAt,
  };
}

export function serializeActivityLog(log: CommitmentActivityEntry[]): string {
  return JSON.stringify(log);
}

import type { Commitment, CommitmentActivityEntry } from "@/lib/commitment-types";
import { mapRowToCommitment } from "@/lib/commitment-map";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import * as sqlite from "@/lib/workspace/sqlite";
import { listProjectsForUser } from "@/lib/workspace/store";

export type AuditTrailEntry = {
  at: string;
  commitmentId: string;
  projectId: string;
  projectName: string;
  commitmentTitle: string;
  body: string;
  kind: CommitmentActivityEntry["kind"];
  archived: boolean;
  currentStatus: string;
};

/** Flattened audit trail from persisted activity_log JSON — nothing is fabricated. */
export async function listAuditTrailForUser(
  userId: string,
  opts: {
    fromIso?: string;
    toIso?: string;
    ownerSubstr?: string;
    includeArchived?: boolean;
  }
): Promise<AuditTrailEntry[]> {
  const projects = await listProjectsForUser(userId);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  let commitments: Commitment[] = [];
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let q = supabase.from("commitments").select("*").eq("clerk_user_id", userId);
    if (!opts.includeArchived) {
      q = q.is("archived_at", null);
    }
    const { data, error } = await q
      .order("last_updated_at", { ascending: false })
      .limit(8000);
    if (error) throw error;
    commitments = (data ?? []).map((r) =>
      mapRowToCommitment(r as Parameters<typeof mapRowToCommitment>[0])
    );
  } else {
    const rows = opts.includeArchived
      ? sqlite.listCommitmentsForUserAll(userId)
      : sqlite.listCommitmentsForUser(userId);
    commitments = rows.map(mapRowToCommitment);
  }

  const fromT = opts.fromIso ? new Date(opts.fromIso).getTime() : null;
  const toT = opts.toIso ? new Date(opts.toIso).getTime() : null;
  const ownerNeedle = opts.ownerSubstr?.trim().toLowerCase() ?? "";

  const out: AuditTrailEntry[] = [];
  for (const c of commitments) {
    if (ownerNeedle) {
      const o = `${c.ownerUserId ?? ""} ${c.ownerDisplayName ?? ""}`.toLowerCase();
      if (!o.includes(ownerNeedle)) continue;
    }
    const pname = nameById.get(c.projectId) ?? "Project";
    for (const e of c.activityLog) {
      const t = new Date(e.at).getTime();
      if (fromT !== null && !Number.isNaN(fromT) && t < fromT) continue;
      if (toT !== null && !Number.isNaN(toT) && t > toT) continue;
      out.push({
        at: e.at,
        commitmentId: c.id,
        projectId: c.projectId,
        projectName: pname,
        commitmentTitle: c.title,
        body: e.body,
        kind: e.kind,
        archived: Boolean(c.archivedAt),
        currentStatus: c.status,
      });
    }
  }
  out.sort((a, b) => (a.at < b.at ? 1 : -1));
  return out;
}

/** One point per UTC day: count of commitments that moved to completed (from activity log), last 30 days. */
export async function getCompletionTrendLast30Days(userId: string): Promise<
  { day: string; count: number }[]
> {
  const entries = await listAuditTrailForUser(userId, { includeArchived: true });
  const now = new Date();
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(d.toISOString().slice(0, 10));
  }
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d, 0);

  for (const e of entries) {
    if (e.kind !== "status") continue;
    if (!e.body.toLowerCase().includes("completed")) continue;
    const day = e.at.slice(0, 10);
    if (counts.has(day)) {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }

  return days.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

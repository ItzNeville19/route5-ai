import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import type { MetricCommitmentRow } from "@/lib/dashboard/compute";
import { computeSnapshotPayload } from "@/lib/dashboard/compute";

export async function fetchMetricRowsForOrg(
  orgId: string,
  ownerId?: string,
  projectId?: string | null
): Promise<MetricCommitmentRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let query = supabase
      .from("org_commitments")
      .select("id, status, deadline, completed_at, owner_id, title, created_at")
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: String((r as Record<string, unknown>).id),
      status: String((r as Record<string, unknown>).status),
      deadline: String((r as Record<string, unknown>).deadline),
      completed_at:
        (r as Record<string, unknown>).completed_at == null
          ? null
          : String((r as Record<string, unknown>).completed_at),
      owner_id: String((r as Record<string, unknown>).owner_id),
      title: String((r as Record<string, unknown>).title),
      created_at: String((r as Record<string, unknown>).created_at),
    }));
  }
  const d = getSqliteHandle();
  const params: unknown[] = [orgId];
  let whereOwner = "";
  if (ownerId) {
    whereOwner = " AND owner_id = ?";
    params.push(ownerId);
  }
  let whereProject = "";
  if (projectId) {
    whereProject = " AND project_id = ?";
    params.push(projectId);
  }
  const rows = d
    .prepare(
      `SELECT id, status, deadline, completed_at, owner_id, title, created_at
       FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL${whereOwner}${whereProject}`
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    status: String(r.status),
    deadline: String(r.deadline),
    completed_at: r.completed_at == null ? null : String(r.completed_at),
    owner_id: String(r.owner_id),
    title: String(r.title),
    created_at: String(r.created_at),
  }));
}

export type DashboardActivityRow = {
  id: string;
  title: string;
  status: string;
  owner_id: string;
  deadline: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export async function fetchRecentCommitmentActivity(
  orgId: string,
  limit = 12,
  ownerId?: string,
  projectId?: string | null
): Promise<DashboardActivityRow[]> {
  const boundedLimit = Math.max(1, Math.min(50, limit));
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let query = supabase
      .from("org_commitments")
      .select("id, title, status, owner_id, deadline, created_at, updated_at, completed_at")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(boundedLimit);
    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String((row as Record<string, unknown>).id),
      title: String((row as Record<string, unknown>).title),
      status: String((row as Record<string, unknown>).status),
      owner_id: String((row as Record<string, unknown>).owner_id),
      deadline: String((row as Record<string, unknown>).deadline ?? ""),
      created_at: String((row as Record<string, unknown>).created_at),
      updated_at: String((row as Record<string, unknown>).updated_at),
      completed_at:
        (row as Record<string, unknown>).completed_at == null
          ? null
          : String((row as Record<string, unknown>).completed_at),
    }));
  }
  const d = getSqliteHandle();
  const params: unknown[] = [orgId];
  let ownerWhere = "";
  if (ownerId) {
    ownerWhere = " AND owner_id = ?";
    params.push(ownerId);
  }
  let projectWhere = "";
  if (projectId) {
    projectWhere = " AND project_id = ?";
    params.push(projectId);
  }
  params.push(boundedLimit);
  const rows = d
    .prepare(
      `SELECT id, title, status, owner_id, deadline, created_at, updated_at, completed_at
       FROM org_commitments
       WHERE org_id = ? AND deleted_at IS NULL${ownerWhere}${projectWhere}
       ORDER BY updated_at DESC, created_at DESC
       LIMIT ?`
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    owner_id: String(row.owner_id),
    deadline: row.deadline == null ? "" : String(row.deadline),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
  }));
}

export type SnapshotRow = {
  snapshot_date: string;
  health_score: number;
  active_count: number;
  on_track_count: number;
  at_risk_count: number;
  overdue_count: number;
  completed_week_count: number;
  completed_month_count: number;
};

export async function fetchExecutionSnapshots(
  orgId: string,
  sinceDateIso: string
): Promise<SnapshotRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("execution_snapshots")
      .select("*")
      .eq("org_id", orgId)
      .gte("snapshot_date", sinceDateIso.slice(0, 10))
      .order("snapshot_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      snapshot_date: String((r as Record<string, unknown>).snapshot_date).slice(0, 10),
      health_score: Number((r as Record<string, unknown>).health_score),
      active_count: Number((r as Record<string, unknown>).active_count),
      on_track_count: Number((r as Record<string, unknown>).on_track_count),
      at_risk_count: Number((r as Record<string, unknown>).at_risk_count),
      overdue_count: Number((r as Record<string, unknown>).overdue_count),
      completed_week_count: Number((r as Record<string, unknown>).completed_week_count),
      completed_month_count: Number((r as Record<string, unknown>).completed_month_count),
    }));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT snapshot_date, health_score, active_count, on_track_count, at_risk_count,
              overdue_count, completed_week_count, completed_month_count
       FROM execution_snapshots WHERE org_id = ? AND snapshot_date >= ?
       ORDER BY snapshot_date ASC`
    )
    .all(orgId, sinceDateIso.slice(0, 10)) as Record<string, unknown>[];
  return rows.map((r) => ({
    snapshot_date: String(r.snapshot_date).slice(0, 10),
    health_score: Number(r.health_score),
    active_count: Number(r.active_count),
    on_track_count: Number(r.on_track_count),
    at_risk_count: Number(r.at_risk_count),
    overdue_count: Number(r.overdue_count),
    completed_week_count: Number(r.completed_week_count),
    completed_month_count: Number(r.completed_month_count),
  }));
}

/** Upsert today’s snapshot for embedded SQLite (Postgres uses RPC in cron route). */
export async function upsertExecutionSnapshotForOrg(orgId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.rpc("compute_execution_snapshot", {
      p_org_id: orgId,
    });
    if (error) throw error;
    return;
  }

  const rows = await fetchMetricRowsForOrg(orgId);
  const nowMs = Date.now();
  const payload = computeSnapshotPayload(rows, nowMs);
  const snapDate = payload.snapshot_date;

  const d = getSqliteHandle();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO execution_snapshots (
      id, org_id, health_score, active_count, on_track_count, at_risk_count, overdue_count,
      completed_week_count, completed_month_count, snapshot_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(org_id, snapshot_date) DO UPDATE SET
      health_score = excluded.health_score,
      active_count = excluded.active_count,
      on_track_count = excluded.on_track_count,
      at_risk_count = excluded.at_risk_count,
      overdue_count = excluded.overdue_count,
      completed_week_count = excluded.completed_week_count,
      completed_month_count = excluded.completed_month_count,
      created_at = excluded.created_at`
  ).run(
    id,
    orgId,
    payload.health_score,
    payload.active_count,
    payload.on_track_count,
    payload.at_risk_count,
    payload.overdue_count,
    payload.completed_week_count,
    payload.completed_month_count,
    snapDate,
    now
  );
}

export async function listAllOrganizationIds(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("organizations").select("id");
    if (error) throw error;
    return (data ?? []).map((r) => String((r as { id: string }).id));
  }
  const d = getSqliteHandle();
  const rows = d.prepare(`SELECT id FROM organizations`).all() as { id: string }[];
  return rows.map((r) => r.id);
}

export async function fetchOrganizationName(orgId: string): Promise<string> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();
    if (error) throw error;
    return (data as { name: string } | null)?.name ?? "Workspace";
  }
  const d = getSqliteHandle();
  const row = d.prepare(`SELECT name FROM organizations WHERE id = ?`).get(orgId) as
    | { name: string }
    | undefined;
  return row?.name ?? "Workspace";
}

import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import type { OrgEscalationRow, OrgEscalationSeverity } from "@/lib/escalations/types";

function mapEscalationRow(r: Record<string, unknown>): OrgEscalationRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    commitmentId: String(r.commitment_id),
    severity: r.severity as OrgEscalationRow["severity"],
    triggeredAt: String(r.triggered_at),
    resolvedAt: r.resolved_at == null ? null : String(r.resolved_at),
    resolvedBy: r.resolved_by == null ? null : String(r.resolved_by),
    resolutionNotes: r.resolution_notes == null ? null : String(r.resolution_notes),
    snoozedUntil: r.snoozed_until == null ? null : String(r.snoozed_until),
    snoozeReason: r.snooze_reason == null ? null : String(r.snooze_reason),
    notifiedOwnerAt: r.notified_owner_at == null ? null : String(r.notified_owner_at),
    notifiedManagerAt: r.notified_manager_at == null ? null : String(r.notified_manager_at),
    notifiedAdminAt: r.notified_admin_at == null ? null : String(r.notified_admin_at),
    notifiedAllAdminsAt: r.notified_all_admins_at == null ? null : String(r.notified_all_admins_at),
    createdAt: String(r.created_at),
  };
}

export type EngineCommitmentRow = {
  id: string;
  org_id: string;
  deadline: string;
  completed_at: string | null;
  last_activity_at: string;
  status: string;
  title: string;
  owner_id: string;
  /** Present when selected from DB columns that include project_id. */
  project_id?: string | null;
};

export async function fetchActiveCommitmentsForOrg(
  orgId: string,
  projectId?: string | null
): Promise<EngineCommitmentRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let q = supabase
      .from("org_commitments")
      .select("id, org_id, deadline, completed_at, last_activity_at, status, title, owner_id")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .is("completed_at", null);
    if (projectId) {
      q = q.eq("project_id", projectId);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as EngineCommitmentRow[];
  }
  const d = getSqliteHandle();
  if (projectId) {
    return d
      .prepare(
        `SELECT id, org_id, deadline, completed_at, last_activity_at, status, title, owner_id
         FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL AND completed_at IS NULL
         AND project_id = ?`
      )
      .all(orgId, projectId) as EngineCommitmentRow[];
  }
  return d
    .prepare(
      `SELECT id, org_id, deadline, completed_at, last_activity_at, status, title, owner_id
       FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL AND completed_at IS NULL`
    )
    .all(orgId) as EngineCommitmentRow[];
}

export async function fetchCommitmentsByIds(
  orgId: string,
  ids: string[]
): Promise<EngineCommitmentRow[]> {
  if (ids.length === 0) return [];
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .select(
        "id, org_id, deadline, completed_at, last_activity_at, status, title, owner_id, project_id"
      )
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .in("id", ids);
    if (error) throw error;
    return (data ?? []) as EngineCommitmentRow[];
  }
  const d = getSqliteHandle();
  const placeholders = ids.map(() => "?").join(",");
  return d
    .prepare(
      `SELECT id, org_id, deadline, completed_at, last_activity_at, status, title, owner_id, project_id
       FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL AND id IN (${placeholders})`
    )
    .all(orgId, ...ids) as EngineCommitmentRow[];
}

/** Any unresolved escalation for this commitment (includes active snoozes). */
export async function fetchUnresolvedEscalationForCommitment(
  commitmentId: string
): Promise<OrgEscalationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_escalations")
      .select("*")
      .eq("commitment_id", commitmentId)
      .is("resolved_at", null)
      .order("triggered_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapEscalationRow(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT * FROM org_escalations WHERE commitment_id = ? AND resolved_at IS NULL ORDER BY triggered_at DESC LIMIT 1`
    )
    .get(commitmentId) as Record<string, unknown> | undefined;
  return row ? mapEscalationRow(row) : null;
}

/** All unresolved escalations for an org (includes snoozed). */
export async function fetchUnresolvedEscalationsForOrg(orgId: string): Promise<OrgEscalationRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_escalations")
      .select("*")
      .eq("org_id", orgId)
      .is("resolved_at", null)
      .order("triggered_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((x) => mapEscalationRow(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM org_escalations WHERE org_id = ? AND resolved_at IS NULL ORDER BY triggered_at DESC`
    )
    .all(orgId) as Record<string, unknown>[];
  return rows.map(mapEscalationRow);
}

export async function insertOrgEscalation(params: {
  orgId: string;
  commitmentId: string;
  severity: OrgEscalationSeverity;
}): Promise<OrgEscalationRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_escalations")
      .insert({
        id,
        org_id: params.orgId,
        commitment_id: params.commitmentId,
        severity: params.severity,
        triggered_at: now,
        created_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    const mapped = mapEscalationRow(data as Record<string, unknown>);
    void import("@/lib/public-api/webhooks-events").then((m) =>
      m.emitEscalationFired(params.orgId, mapped)
    );
    return mapped;
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO org_escalations (
      id, org_id, commitment_id, severity, triggered_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, params.orgId, params.commitmentId, params.severity, now, now);
  const row = d.prepare(`SELECT * FROM org_escalations WHERE id = ?`).get(id) as Record<string, unknown>;
  const mapped = mapEscalationRow(row);
  void import("@/lib/public-api/webhooks-events").then((m) =>
    m.emitEscalationFired(params.orgId, mapped)
  );
  return mapped;
}

export async function updateEscalationSeverity(
  escalationId: string,
  severity: OrgEscalationSeverity
): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("org_escalations")
      .update({ severity, triggered_at: now })
      .eq("id", escalationId);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`UPDATE org_escalations SET severity = ?, triggered_at = ? WHERE id = ?`).run(
    severity,
    now,
    escalationId
  );
}

export async function updateEscalationNotifyFields(
  escalationId: string,
  patch: Partial<{
    notifiedOwnerAt: string | null;
    notifiedManagerAt: string | null;
    notifiedAdminAt: string | null;
    notifiedAllAdminsAt: string | null;
  }>
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row: Record<string, unknown> = {};
    if (patch.notifiedOwnerAt !== undefined) row.notified_owner_at = patch.notifiedOwnerAt;
    if (patch.notifiedManagerAt !== undefined) row.notified_manager_at = patch.notifiedManagerAt;
    if (patch.notifiedAdminAt !== undefined) row.notified_admin_at = patch.notifiedAdminAt;
    if (patch.notifiedAllAdminsAt !== undefined) row.notified_all_admins_at = patch.notifiedAllAdminsAt;
    const { error } = await supabase.from("org_escalations").update(row).eq("id", escalationId);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const cur = d.prepare(`SELECT * FROM org_escalations WHERE id = ?`).get(escalationId) as Record<
    string,
    unknown
  > | null;
  if (!cur) return;
  const notified_owner_at =
    patch.notifiedOwnerAt !== undefined ? patch.notifiedOwnerAt : cur.notified_owner_at;
  const notified_manager_at =
    patch.notifiedManagerAt !== undefined ? patch.notifiedManagerAt : cur.notified_manager_at;
  const notified_admin_at =
    patch.notifiedAdminAt !== undefined ? patch.notifiedAdminAt : cur.notified_admin_at;
  const notified_all_admins_at =
    patch.notifiedAllAdminsAt !== undefined ? patch.notifiedAllAdminsAt : cur.notified_all_admins_at;
  d.prepare(
    `UPDATE org_escalations SET notified_owner_at = ?, notified_manager_at = ?, notified_admin_at = ?, notified_all_admins_at = ? WHERE id = ?`
  ).run(notified_owner_at, notified_manager_at, notified_admin_at, notified_all_admins_at, escalationId);
}

export async function listOrgIdsWithActiveCommitments(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .select("org_id")
      .is("deleted_at", null)
      .is("completed_at", null);
    if (error) throw error;
    const set = new Set<string>();
    for (const r of data ?? []) {
      set.add(String((r as { org_id: string }).org_id));
    }
    return [...set];
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT DISTINCT org_id FROM org_commitments WHERE deleted_at IS NULL AND completed_at IS NULL`
    )
    .all() as { org_id: string }[];
  return rows.map((r) => r.org_id);
}

export async function listEscalationsForApi(params: {
  orgId: string;
  severity?: string;
  commitmentId?: string;
  resolved?: "open" | "resolved" | "all";
  /** When set with resolved=open: filter snoozed vs active. */
  snoozed?: "yes" | "no" | "any";
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<OrgEscalationRow[]> {
  const limit = Math.min(params.limit ?? 200, 500);
  const offset = Math.max(0, params.offset ?? 0);
  const fetchCap = Math.min(2000, Math.max(limit * 2, offset + limit) * 2);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let q = supabase.from("org_escalations").select("*").eq("org_id", params.orgId);
    if (params.severity) q = q.eq("severity", params.severity);
    if (params.commitmentId) q = q.eq("commitment_id", params.commitmentId);
    if (params.resolved === "open") q = q.is("resolved_at", null);
    if (params.resolved === "resolved") q = q.not("resolved_at", "is", null);
    if (params.dateFrom) q = q.gte("triggered_at", params.dateFrom);
    if (params.dateTo) q = q.lte("triggered_at", params.dateTo);
    q = q.order("triggered_at", { ascending: false }).limit(fetchCap);
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map((x) => mapEscalationRow(x as Record<string, unknown>));
    const now = Date.now();
    if (params.resolved === "open" && params.snoozed === "yes") {
      rows = rows.filter((e) => e.snoozedUntil && new Date(e.snoozedUntil).getTime() > now);
    } else if (params.resolved === "open" && params.snoozed === "no") {
      rows = rows.filter((e) => !e.snoozedUntil || new Date(e.snoozedUntil).getTime() <= now);
    }
    return rows.slice(offset, offset + limit);
  }
  const d = getSqliteHandle();
  const parts = ["org_id = ?"];
  const vals: unknown[] = [params.orgId];
  if (params.severity) {
    parts.push("severity = ?");
    vals.push(params.severity);
  }
  if (params.commitmentId) {
    parts.push("commitment_id = ?");
    vals.push(params.commitmentId);
  }
  if (params.resolved === "open") parts.push("resolved_at IS NULL");
  if (params.resolved === "resolved") parts.push("resolved_at IS NOT NULL");
  if (params.dateFrom) {
    parts.push("triggered_at >= ?");
    vals.push(params.dateFrom);
  }
  if (params.dateTo) {
    parts.push("triggered_at <= ?");
    vals.push(params.dateTo);
  }
  const sql = `SELECT * FROM org_escalations WHERE ${parts.join(" AND ")} ORDER BY triggered_at DESC LIMIT ?`;
  vals.push(fetchCap);
  let rows = (d.prepare(sql).all(...vals) as Record<string, unknown>[]).map(mapEscalationRow);
  const now = Date.now();
  if (params.resolved === "open" && params.snoozed === "yes") {
    rows = rows.filter((e) => e.snoozedUntil && new Date(e.snoozedUntil).getTime() > now);
  } else if (params.resolved === "open" && params.snoozed === "no") {
    rows = rows.filter((e) => !e.snoozedUntil || new Date(e.snoozedUntil).getTime() <= now);
  }
  return rows.slice(offset, offset + limit);
}

export async function getEscalationByIdForOrg(
  escalationId: string,
  orgId: string
): Promise<OrgEscalationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_escalations")
      .select("*")
      .eq("id", escalationId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapEscalationRow(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_escalations WHERE id = ? AND org_id = ?`)
    .get(escalationId, orgId) as Record<string, unknown> | undefined;
  return row ? mapEscalationRow(row) : null;
}

export async function snoozeEscalation(
  escalationId: string,
  orgId: string,
  snoozedUntil: string,
  snoozeReason: string
): Promise<OrgEscalationRow | null> {
  const existing = await getEscalationByIdForOrg(escalationId, orgId);
  if (!existing || existing.resolvedAt) return null;
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_escalations")
      .update({ snoozed_until: snoozedUntil, snooze_reason: snoozeReason })
      .eq("id", escalationId)
      .eq("org_id", orgId)
      .select("*")
      .single();
    if (error) throw error;
    const mapped = data ? mapEscalationRow(data as Record<string, unknown>) : null;
    if (mapped) {
      void import("@/lib/public-api/webhooks-events").then((m) => m.emitEscalationSnoozed(orgId, mapped));
    }
    return mapped;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_escalations SET snoozed_until = ?, snooze_reason = ? WHERE id = ? AND org_id = ?`
  ).run(snoozedUntil, snoozeReason, escalationId, orgId);
  const row = d.prepare(`SELECT * FROM org_escalations WHERE id = ?`).get(escalationId) as
    | Record<string, unknown>
    | undefined;
  const mapped = row ? mapEscalationRow(row) : null;
  if (mapped) {
    void import("@/lib/public-api/webhooks-events").then((m) => m.emitEscalationSnoozed(orgId, mapped));
  }
  return mapped;
}

export async function resolveEscalation(
  escalationId: string,
  orgId: string,
  resolvedBy: string,
  resolutionNotes: string
): Promise<OrgEscalationRow | null> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_escalations")
      .update({
        resolved_at: now,
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes,
      })
      .eq("id", escalationId)
      .eq("org_id", orgId)
      .is("resolved_at", null)
      .select("*")
      .single();
    if (error) throw error;
    const mapped = data ? mapEscalationRow(data as Record<string, unknown>) : null;
    if (mapped) {
      void import("@/lib/public-api/webhooks-events").then((m) => m.emitEscalationResolved(orgId, mapped));
    }
    return mapped;
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(
      `UPDATE org_escalations SET resolved_at = ?, resolved_by = ?, resolution_notes = ?
       WHERE id = ? AND org_id = ? AND resolved_at IS NULL`
    )
    .run(now, resolvedBy, resolutionNotes, escalationId, orgId);
  if (r.changes === 0) return null;
  const row = d.prepare(`SELECT * FROM org_escalations WHERE id = ?`).get(escalationId) as Record<
    string,
    unknown
  >;
  const mapped = mapEscalationRow(row);
  void import("@/lib/public-api/webhooks-events").then((m) => m.emitEscalationResolved(orgId, mapped));
  return mapped;
}

export async function fetchOpenEscalationsNeedingStaleNotify(orgId: string): Promise<OrgEscalationRow[]> {
  return listEscalationsForApi({ orgId, resolved: "open", snoozed: "no", limit: 500 });
}

export async function getOrganizationClerkUserId(orgId: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("clerk_user_id")
      .eq("id", orgId)
      .maybeSingle();
    if (error) throw error;
    return data ? String((data as { clerk_user_id: string }).clerk_user_id) : null;
  }
  const d = getSqliteHandle();
  const row = d.prepare(`SELECT clerk_user_id FROM organizations WHERE id = ?`).get(orgId) as
    | { clerk_user_id: string }
    | undefined;
  return row?.clerk_user_id ?? null;
}

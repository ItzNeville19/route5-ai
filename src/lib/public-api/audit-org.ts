import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export type OrgAuditLogEntry = {
  id: string;
  commitmentId: string;
  commitmentTitle: string;
  changedBy: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
};

async function commitmentIdsForOrg(orgId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .select("id")
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((r) => String((r as { id: string }).id));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT id FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL`)
    .all(orgId) as { id: string }[];
  return rows.map((r) => r.id);
}

export async function listOrgAuditLog(params: {
  orgId: string;
  userId?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
}): Promise<{ entries: OrgAuditLogEntry[]; total: number }> {
  const limit = Math.min(100, Math.max(1, params.limit));
  const offset = Math.max(0, params.offset);

  const cids = await commitmentIdsForOrg(params.orgId);
  if (cids.length === 0) return { entries: [], total: 0 };

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let q = supabase.from("org_commitment_history").select("*", { count: "exact" }).in("commitment_id", cids);
    if (params.userId) q = q.eq("changed_by", params.userId);
    if (params.entityType) q = q.eq("field_changed", params.entityType);
    if (params.dateFrom) q = q.gte("changed_at", params.dateFrom);
    if (params.dateTo) q = q.lte("changed_at", params.dateTo);
    q = q.order("changed_at", { ascending: false }).range(offset, offset + limit - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    const titles = new Map<string, string>();
    const { data: cs } = await supabase
      .from("org_commitments")
      .select("id, title")
      .in("id", [...new Set((data ?? []).map((x) => String((x as { commitment_id: string }).commitment_id)))]);
    for (const c of cs ?? []) {
      const row = c as { id: string; title: string };
      titles.set(row.id, row.title);
    }
    const entries: OrgAuditLogEntry[] = (data ?? []).map((r) => {
      const x = r as Record<string, unknown>;
      const cid = String(x.commitment_id);
      return {
        id: String(x.id),
        commitmentId: cid,
        commitmentTitle: titles.get(cid) ?? "",
        changedBy: String(x.changed_by),
        fieldChanged: String(x.field_changed),
        oldValue: x.old_value == null ? null : String(x.old_value),
        newValue: x.new_value == null ? null : String(x.new_value),
        changedAt: String(x.changed_at),
      };
    });
    return { entries, total: count ?? entries.length };
  }

  const d = getSqliteHandle();
  const placeholders = cids.map(() => "?").join(",");
  const parts = [`h.commitment_id IN (${placeholders})`];
  const vals: unknown[] = [...cids];
  if (params.userId) {
    parts.push("h.changed_by = ?");
    vals.push(params.userId);
  }
  if (params.entityType) {
    parts.push("h.field_changed = ?");
    vals.push(params.entityType);
  }
  if (params.dateFrom) {
    parts.push("h.changed_at >= ?");
    vals.push(params.dateFrom);
  }
  if (params.dateTo) {
    parts.push("h.changed_at <= ?");
    vals.push(params.dateTo);
  }
  const where = parts.join(" AND ");
  const countRow = d
    .prepare(
      `SELECT COUNT(*) as c FROM org_commitment_history h
       INNER JOIN org_commitments c ON c.id = h.commitment_id
       WHERE ${where} AND c.org_id = ?`
    )
    .get(...vals, params.orgId) as { c: number };
  const total = countRow?.c ?? 0;
  const raw = d
    .prepare(
      `SELECT h.id as id, h.commitment_id as commitment_id, h.changed_by as changed_by,
              h.field_changed as field_changed, h.old_value as old_value, h.new_value as new_value,
              h.changed_at as changed_at, c.title as commitment_title
       FROM org_commitment_history h
       INNER JOIN org_commitments c ON c.id = h.commitment_id
       WHERE ${where} AND c.org_id = ?
       ORDER BY h.changed_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...vals, params.orgId, limit, offset) as Record<string, unknown>[];
  const entries: OrgAuditLogEntry[] = raw.map((r) => ({
    id: String(r.id),
    commitmentId: String(r.commitment_id),
    commitmentTitle: String(r.commitment_title ?? ""),
    changedBy: String(r.changed_by),
    fieldChanged: String(r.field_changed),
    oldValue: r.old_value == null ? null : String(r.old_value),
    newValue: r.new_value == null ? null : String(r.new_value),
    changedAt: String(r.changed_at),
  }));
  return { entries, total };
}

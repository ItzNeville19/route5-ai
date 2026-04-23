/**
 * Lightweight active (non-completed) commitment counts per owner for org directory UIs.
 * Avoids loading full commitment rows into the organization API.
 */
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export async function countActiveCommitmentsByOwnerForOrg(orgId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let start = 0;
    const batch = 3000;
    for (;;) {
      const end = start + batch - 1;
      const { data, error } = await supabase
        .from("org_commitments")
        .select("owner_id")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .neq("status", "completed")
        .range(start, end);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) break;
      for (const row of rows as { owner_id: string }[]) {
        const oid = String(row.owner_id ?? "").trim();
        if (!oid) continue;
        map.set(oid, (map.get(oid) ?? 0) + 1);
      }
      if (rows.length < batch) break;
      start += batch;
    }
    return map;
  }

  const d = getSqliteHandle();
  const stmt = d.prepare(
    `SELECT owner_id, COUNT(*) AS cnt FROM org_commitments
     WHERE org_id = ? AND deleted_at IS NULL AND status != 'completed'
     GROUP BY owner_id`
  );
  const rows = stmt.all(orgId) as { owner_id: string; cnt: number }[];
  for (const r of rows) {
    map.set(String(r.owner_id), Number(r.cnt) || 0);
  }
  return map;
}

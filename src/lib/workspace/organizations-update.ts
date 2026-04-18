import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export async function updateOrganizationProfile(
  orgId: string,
  fields: { name?: string; primaryUseCase?: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row: Record<string, unknown> = { updated_at: now };
    if (fields.name !== undefined) row.name = fields.name;
    if (fields.primaryUseCase !== undefined) row.primary_use_case = fields.primaryUseCase;
    const { error } = await supabase.from("organizations").update(row).eq("id", orgId);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const cur = d.prepare(`SELECT name, primary_use_case FROM organizations WHERE id = ?`).get(orgId) as
    | { name: string; primary_use_case: string | null }
    | undefined;
  if (!cur) throw new Error("ORG_NOT_FOUND");
  const name = fields.name !== undefined ? fields.name : cur.name;
  const pu =
    fields.primaryUseCase !== undefined ? fields.primaryUseCase : cur.primary_use_case ?? null;
  d.prepare(`UPDATE organizations SET name = ?, primary_use_case = ?, updated_at = ? WHERE id = ?`).run(
    name,
    pu,
    now,
    orgId
  );
}

export async function getOrganizationProfile(orgId: string): Promise<{
  name: string;
  primaryUseCase: string | null;
}> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("name, primary_use_case")
      .eq("id", orgId)
      .single();
    if (error) throw error;
    const r = data as { name: string; primary_use_case: string | null };
    return { name: r.name, primaryUseCase: r.primary_use_case };
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT name, primary_use_case FROM organizations WHERE id = ?`)
    .get(orgId) as { name: string; primary_use_case: string | null } | undefined;
  if (!row) throw new Error("ORG_NOT_FOUND");
  return { name: row.name, primaryUseCase: row.primary_use_case };
}

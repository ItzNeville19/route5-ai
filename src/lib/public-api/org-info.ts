import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { getOrgSubscription } from "@/lib/billing/store";

export async function getOrgPublicDetails(orgId: string): Promise<{
  id: string;
  name: string;
  plan: string;
  seat_count: number;
  created_at: string;
}> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).single();
    if (error) throw error;
    const r = data as Record<string, unknown>;
    const sub = await getOrgSubscription(orgId);
    return {
      id: String(r.id),
      name: String(r.name ?? "Workspace"),
      plan: String(r.plan ?? "free"),
      seat_count: sub?.seatCount ?? 1,
      created_at: String(r.created_at),
    };
  }
  const d = getSqliteHandle();
  const row = d.prepare(`SELECT * FROM organizations WHERE id = ?`).get(orgId) as Record<string, unknown> | undefined;
  if (!row) throw new Error("NOT_FOUND");
  const sub = await getOrgSubscription(orgId);
  return {
    id: String(row.id),
    name: String(row.name ?? "Workspace"),
    plan: String(row.plan ?? "free"),
    seat_count: sub?.seatCount ?? 1,
    created_at: String(row.created_at),
  };
}

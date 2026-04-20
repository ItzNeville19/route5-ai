import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { getValidTeamsAccessToken } from "@/lib/integrations/teams-token";
import { getTeamsIntegrationForOrg, updateTeamsIntegrationMetadata } from "@/lib/integrations/zoom-teams-integration";
import { appBaseUrl } from "@/lib/integrations/app-url";

export const runtime = "nodejs";

async function listTeamsOrgIds(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("org_id")
      .eq("type", "teams")
      .eq("status", "connected");
    if (error) throw error;
    return (data ?? []).map((r) => String((r as { org_id: string }).org_id));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT org_id FROM org_integrations WHERE type = 'teams' AND status = 'connected'`)
    .all() as { org_id: string }[];
  return rows.map((r) => r.org_id);
}

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const secretState = process.env.TEAMS_GRAPH_SUBSCRIPTION_SECRET?.trim() ?? "dev-client-state";
  const notificationUrl = `${appBaseUrl()}/api/integrations/teams/webhook`;
  let renewed = 0;
  for (const orgId of await listTeamsOrgIds()) {
    const integ = await getTeamsIntegrationForOrg(orgId);
    if (!integ?.metadata?.teams_graph_subscription_id) continue;
    const token = await getValidTeamsAccessToken(integ);
    if (!token) continue;
    try {
      const subRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "created",
          notificationUrl,
          resource: "/teams/getAllMessages",
          expirationDateTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
          clientState: secretState,
        }),
      });
      const subJson = (await subRes.json()) as { id?: string; expirationDateTime?: string };
      if (subJson.id) {
        await updateTeamsIntegrationMetadata(orgId, {
          teams_graph_subscription_id: subJson.id,
          teams_graph_subscription_expires_at: subJson.expirationDateTime ?? null,
        });
        renewed++;
      }
    } catch {
      /* ignore */
    }
  }
  return NextResponse.json({ ok: true, renewed });
}

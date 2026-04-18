import { NextResponse } from "next/server";
import { getTeamsIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { getValidTeamsAccessToken } from "@/lib/integrations/teams-token";
import { processTeamsChannelMessage } from "@/lib/integrations/teams-process-message";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export const runtime = "nodejs";

async function listConnectedTeamsOrgs(): Promise<{ orgId: string }[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("org_id")
      .eq("type", "teams")
      .eq("status", "connected");
    if (error) throw error;
    return (data ?? []).map((r) => ({ orgId: String((r as { org_id: string }).org_id) }));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT org_id FROM org_integrations WHERE type = 'teams' AND status = 'connected'`)
    .all() as { org_id: string }[];
  return rows.map((r) => ({ orgId: r.org_id }));
}

export async function POST(req: Request) {
  const secret = process.env.TEAMS_GRAPH_SUBSCRIPTION_SECRET?.trim() ?? "";
  let body: {
    value?: Array<{
      clientState?: string;
      resource?: string;
      subscriptionId?: string;
    }>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const n of body.value ?? []) {
    if (secret && n.clientState !== secret) {
      continue;
    }
    const resource = n.resource?.trim();
    if (!resource) continue;

    const orgs = await listConnectedTeamsOrgs();
    for (const { orgId } of orgs) {
      const integ = await getTeamsIntegrationForOrg(orgId);
      if (!integ) continue;
      const token = await getValidTeamsAccessToken(integ);
      if (!token) continue;
      try {
        const path = resource.startsWith("https://") ? resource : `https://graph.microsoft.com/v1.0/${resource}`;
        const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
        const msg = (await res.json()) as {
          id?: string;
          body?: { content?: string };
          createdDateTime?: string;
          from?: { user?: { id?: string; displayName?: string } };
          channelIdentity?: { teamId?: string; channelId?: string };
        };
        if (!res.ok || !msg.id) continue;
        const teamId = msg.channelIdentity?.teamId ?? "unknown";
        const channelId = msg.channelIdentity?.channelId ?? "unknown";
        const text = msg.body?.content?.replace(/<[^>]+>/g, " ")?.trim() ?? "";
        await processTeamsChannelMessage({
          integration: integ,
          teamId,
          channelId,
          messageId: msg.id,
          text,
          fromUserId: msg.from?.user?.id ?? null,
          fromName: msg.from?.user?.displayName ?? null,
          receivedAt: msg.createdDateTime ?? new Date().toISOString(),
        });
        break;
      } catch {
        /* try next org */
      }
    }
  }

  return NextResponse.json({ ok: true });
}

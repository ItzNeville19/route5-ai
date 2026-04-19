import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { getValidTeamsAccessToken } from "@/lib/integrations/teams-token";
import {
  disconnectTeamsIntegration,
  getTeamsIntegrationForOrg,
} from "@/lib/integrations/zoom-teams-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";

export const runtime = "nodejs";

export async function POST() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const row = await getTeamsIntegrationForOrg(orgId);
  if (row?.metadata?.teams_graph_subscription_id) {
    try {
      const token = await getValidTeamsAccessToken(row);
      if (token) {
        await fetch(
          `https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(row.metadata.teams_graph_subscription_id!)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch {
      /* ignore */
    }
  }
  await disconnectTeamsIntegration(orgId);
  return NextResponse.json({ ok: true });
}

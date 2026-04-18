import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getTeamsIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { countTeamsForOrg } from "@/lib/integrations/meeting-stores";
import { checkPlanLimit } from "@/lib/billing/gate";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await ensureOrganizationForClerkUser(userId);
  const gate = await checkPlanLimit(orgId, "integrations");
  const row = await getTeamsIntegrationForOrg(orgId);
  const connected = row?.status === "connected";
  const stats = connected ? await countTeamsForOrg(orgId) : { messages: 0, decisions: 0 };
  const meta = row?.metadata;
  return NextResponse.json({
    planAllows: gate.allowed,
    teamsOAuth: {
      connected,
      workspaceName: row?.teamName ?? null,
      tenantId: row?.teamId ?? null,
      monitoredChannels: meta?.teams_monitored_channel_ids?.length ?? 0,
      messagesCaptured: stats.messages,
      decisionsCaptured: stats.decisions,
    },
  });
}

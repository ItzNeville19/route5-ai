import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getZoomIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { countZoomMeetingsForOrg } from "@/lib/integrations/meeting-stores";
import { checkPlanLimit } from "@/lib/billing/gate";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await ensureOrganizationForClerkUser(userId);
  const gate = await checkPlanLimit(orgId, "integrations");
  const row = await getZoomIntegrationForOrg(orgId);
  const connected = row?.status === "connected";
  const stats = connected ? await countZoomMeetingsForOrg(orgId) : { processed: 0, decisions: 0 };
  return NextResponse.json({
    planAllows: gate.allowed,
    zoomOAuth: {
      connected,
      label: row?.teamName ?? null,
      connectedAt: row?.connectedAt ?? null,
      meetingsProcessed: stats.processed,
      decisionsCaptured: stats.decisions,
    },
  });
}

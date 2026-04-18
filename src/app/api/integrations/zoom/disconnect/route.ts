import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { decryptSecret } from "@/lib/integrations/token-crypto";
import { revokeZoomToken } from "@/lib/integrations/zoom-oauth";
import { disconnectZoomIntegration, getZoomIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await ensureOrganizationForClerkUser(userId);
  const row = await getZoomIntegrationForOrg(orgId);
  if (row?.refreshTokenEncrypted) {
    try {
      const t = decryptSecret(row.refreshTokenEncrypted);
      await revokeZoomToken(t);
    } catch {
      /* ignore */
    }
  }
  await disconnectZoomIntegration(orgId);
  return NextResponse.json({ ok: true });
}

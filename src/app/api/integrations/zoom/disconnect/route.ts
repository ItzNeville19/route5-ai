import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/integrations/token-crypto";
import { revokeZoomToken } from "@/lib/integrations/zoom-oauth";
import { disconnectZoomIntegration, getZoomIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";

export const runtime = "nodejs";

export async function POST() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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

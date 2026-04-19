import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getSlackIntegrationForOrg, disconnectSlackIntegration } from "@/lib/integrations/org-integrations-store";
import { getSlackBotAccessToken } from "@/lib/integrations/slack-token";
import { revokeSlackToken } from "@/lib/integrations/slack-oauth-exchange";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "slack:disconnect", userId, { userLimit: 30, ipLimit: 60 })
  );
  if (rateLimited) return rateLimited;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const row = await getSlackIntegrationForOrg(orgId);
    if (row?.status === "connected") {
      const tok = getSlackBotAccessToken(row);
      if (tok) await revokeSlackToken(tok);
    }
    await disconnectSlackIntegration(orgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

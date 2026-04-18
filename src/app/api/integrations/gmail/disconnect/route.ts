import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { disconnectGmailIntegration, getGmailIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { getValidGmailAccessToken } from "@/lib/integrations/gmail-token";
import { gmailUsersStop, revokeGoogleRefreshToken } from "@/lib/integrations/gmail-google";
import { decryptSecret } from "@/lib/integrations/token-crypto";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "gmail:disconnect", userId, { userLimit: 30, ipLimit: 60 })
  );
  if (rateLimited) return rateLimited;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const row = await getGmailIntegrationForOrg(orgId);
    if (row?.status === "connected") {
      const access = await getValidGmailAccessToken(row);
      if (access) await gmailUsersStop(access);
      if (row.refreshTokenEncrypted) {
        try {
          const rt = decryptSecret(row.refreshTokenEncrypted);
          if (rt) await revokeGoogleRefreshToken(rt);
        } catch {
          /* ignore */
        }
      }
    }
    await disconnectGmailIntegration(orgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { getSlackBotAccessToken } from "@/lib/integrations/slack-token";
import { slackApi } from "@/lib/integrations/slack-api";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "slack:channels", userId, { userLimit: 60, ipLimit: 120 })
  );
  if (rateLimited) return rateLimited;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const integ = await getSlackIntegrationForOrg(orgId);
    if (!integ || integ.status !== "connected") {
      return NextResponse.json({ channels: [] });
    }
    const token = getSlackBotAccessToken(integ);
    if (!token) {
      return NextResponse.json({ channels: [] });
    }
    const j = await slackApi(token, "conversations.list", {
      types: "public_channel,private_channel",
      limit: 500,
    });
    const channels = (j.channels as { id?: string; name?: string }[] | undefined)?.map((c) => ({
      id: c.id,
      name: c.name ? `#${c.name}` : c.id,
    })) ?? [];
    return NextResponse.json({ channels });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

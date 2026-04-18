import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNotionIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { setNotionDatabaseWatching } from "@/lib/integrations/notion-store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "notion:unwatch", userId, { userLimit: 60, ipLimit: 120 })
  );
  if (rateLimited) return rateLimited;

  const { id: rawId } = await ctx.params;
  const databaseId = decodeURIComponent(rawId);

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const integ = await getNotionIntegrationForOrg(orgId);
    if (!integ || integ.status !== "connected") {
      return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
    }
    await setNotionDatabaseWatching(orgId, databaseId, false);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

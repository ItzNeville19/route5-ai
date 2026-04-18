import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { listSlackReviewQueue } from "@/lib/integrations/org-integrations-store";
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
    userAndIpRateScopes(req, "slack:review", userId, { userLimit: 120, ipLimit: 240 })
  );
  if (rateLimited) return rateLimited;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const pending = await listSlackReviewQueue(orgId, 100);
    return NextResponse.json({ orgId, pending });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

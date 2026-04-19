import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { listSlackReviewQueue } from "@/lib/integrations/org-integrations-store";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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

import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { computeVelocityWeeks } from "@/lib/dashboard/compute";
import { fetchMetricRowsForOrg } from "@/lib/dashboard/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "dashboard:velocity", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const rows = await fetchMetricRowsForOrg(orgId);
    const weeks = computeVelocityWeeks(rows);
    return NextResponse.json({ orgId, weeks });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

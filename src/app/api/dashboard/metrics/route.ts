import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { computeLiveDashboardMetrics } from "@/lib/dashboard/compute";
import { fetchMetricRowsForOrg } from "@/lib/dashboard/store";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "dashboard:metrics", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const rows = await fetchMetricRowsForOrg(orgId);
    const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
    const names = await resolveOwnerDisplayNames(ownerIds);
    const metrics = computeLiveDashboardMetrics(rows, names);
    return NextResponse.json({ orgId, metrics });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

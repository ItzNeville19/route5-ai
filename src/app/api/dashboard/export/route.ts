import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { computeLiveDashboardMetrics, computeVelocityWeeks } from "@/lib/dashboard/compute";
import { buildExecutiveScorecardPdf } from "@/lib/dashboard/pdf-export";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import {
  fetchExecutionSnapshots,
  fetchMetricRowsForOrg,
  fetchOrganizationName,
} from "@/lib/dashboard/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { checkPlanLimit, planLimitResponse } from "@/lib/billing/gate";
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
    userAndIpRateScopes(req, "dashboard:export", userId, {
      userLimit: 20,
      ipLimit: 40,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const gate = await checkPlanLimit(orgId, "export");
    if (!gate.allowed && gate.upgrade) {
      return planLimitResponse(gate.upgrade);
    }
    const rows = await fetchMetricRowsForOrg(orgId);
    const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
    const names = await resolveOwnerDisplayNames(ownerIds);
    const metrics = computeLiveDashboardMetrics(rows, names);
    const since = new Date();
    since.setUTCFullYear(since.getUTCFullYear() - 1);
    const trend = await fetchExecutionSnapshots(orgId, since.toISOString());
    const velocity = computeVelocityWeeks(rows);
    const orgName = await fetchOrganizationName(orgId);
    const buf = buildExecutiveScorecardPdf({
      orgName,
      generatedAt: new Date().toISOString(),
      metrics,
      trend,
      velocity,
    });
    const filename = `route5-scorecard-${orgId.slice(0, 8)}.pdf`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

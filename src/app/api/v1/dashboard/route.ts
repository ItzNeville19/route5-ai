import type { NextRequest } from "next/server";
import { withPublicApi } from "@/lib/public-api/middleware";
import { jsonSuccess } from "@/lib/public-api/response";
import { fetchMetricRowsForOrg } from "@/lib/dashboard/store";
import { computeLiveDashboardMetrics } from "@/lib/dashboard/compute";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import { listEscalationsForApi, fetchCommitmentsByIds } from "@/lib/escalations/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withPublicApi(req, "read", async (ctx) => {
    const rows = await fetchMetricRowsForOrg(ctx.orgId);
    const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
    const names = await resolveOwnerDisplayNames(ownerIds);
    const metrics = computeLiveDashboardMetrics(rows, names);

    const openEsc = await listEscalationsForApi({
      orgId: ctx.orgId,
      resolved: "open",
      snoozed: "no",
      limit: 8,
      offset: 0,
    });
    const cids = [...new Set(openEsc.map((e) => e.commitmentId))];
    const commitments = await fetchCommitmentsByIds(ctx.orgId, cids);
    const cmap = new Map(commitments.map((c) => [c.id, c]));
    const top_escalations = openEsc.slice(0, 8).map((e) => {
      const c = cmap.get(e.commitmentId);
      return {
        id: e.id,
        commitment_id: e.commitmentId,
        title: c?.title ?? "",
        owner_id: c?.owner_id ?? "",
        deadline: c?.deadline ?? "",
        severity: e.severity,
      };
    });

    return jsonSuccess(
      {
        health_score: metrics.healthScore,
        active_count: metrics.activeCount,
        on_track_count: metrics.onTrackCount,
        at_risk_count: metrics.atRiskCount,
        overdue_count: metrics.overdueCount,
        completed_week_count: metrics.completedWeekCount,
        top_escalations,
      },
      ctx.requestId
    );
  });
}

import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { fetchExecutionSnapshots, fetchMetricRowsForOrg, type SnapshotRow } from "@/lib/dashboard/store";
import { getActiveMembershipForUser } from "@/lib/workspace/org-members";
import { computeLiveDashboardMetrics } from "@/lib/dashboard/compute";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

function buildSelfSnapshots(rows: Awaited<ReturnType<typeof fetchMetricRowsForOrg>>, since: Date): SnapshotRow[] {
  const now = new Date();
  const dayCursor = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const out: SnapshotRow[] = [];
  while (dayCursor.getTime() <= end.getTime()) {
    const dayIso = dayCursor.toISOString().slice(0, 10);
    const upToDay = rows.filter((row) => new Date(row.created_at).getTime() <= dayCursor.getTime() + 86_399_999);
    const metrics = computeLiveDashboardMetrics(upToDay, new Map());
    out.push({
      snapshot_date: dayIso,
      health_score: metrics.healthScore,
      active_count: metrics.activeCount,
      on_track_count: metrics.onTrackCount,
      at_risk_count: metrics.atRiskCount,
      overdue_count: metrics.overdueCount,
      completed_week_count: metrics.completedWeekCount,
      completed_month_count: metrics.completedMonthCount,
    });
    dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
  }
  return out;
}

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "dashboard:trend", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "30d";
  const now = new Date();
  let since: Date;
  if (range === "90d") {
    since = new Date(now);
    since.setUTCDate(since.getUTCDate() - 90);
  } else if (range === "12m") {
    since = new Date(now);
    since.setUTCFullYear(since.getUTCFullYear() - 1);
  } else {
    since = new Date(now);
    since.setUTCDate(since.getUTCDate() - 30);
  }

  try {
    const membership = await getActiveMembershipForUser(userId);
    const role = membership?.role ?? "member";
    const requestedScope = url.searchParams.get("scope");
    const canViewOrg = role === "admin" || role === "manager";
    const scope: "org" | "self" =
      requestedScope === "self" ? "self" : canViewOrg ? "org" : "self";
    const orgId = await ensureOrganizationForClerkUser(userId);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    if (projectId) {
      const rows = await fetchMetricRowsForOrg(
        orgId,
        scope === "self" ? userId : undefined,
        projectId
      );
      const snapshots = buildSelfSnapshots(rows, since);
      return NextResponse.json({ orgId, range, snapshots, scope, role, canViewOrg });
    }
    if (scope === "self") {
      const rows = await fetchMetricRowsForOrg(orgId, userId);
      const snapshots = buildSelfSnapshots(rows, since);
      return NextResponse.json({ orgId, range, snapshots, scope, role, canViewOrg });
    }
    const snapshots = await fetchExecutionSnapshots(orgId, since.toISOString());
    return NextResponse.json({ orgId, range, snapshots, scope, role, canViewOrg });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

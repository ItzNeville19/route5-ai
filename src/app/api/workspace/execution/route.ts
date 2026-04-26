import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { fetchCommitments } from "@/lib/commitments/repository";
import { isAtRisk, isOverdue, isUnassigned, teamLoad } from "@/lib/commitments/derived-metrics";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "workspace:execution:get", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const rows = await fetchCommitments(userId, { projectId });
    const active = rows.filter((row) => row.status !== "done");
    const done = rows.filter((row) => row.status === "done");
    const atRiskRows = active.filter((row) => isAtRisk(row));
    const overdueRows = active.filter((row) => isOverdue(row));
    const unassignedRows = active.filter((row) => isUnassigned(row));
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completedThisWeek = done.filter((row) => new Date(row.updatedAt).getTime() >= weekStart).length;
    const completedPct = Math.round((completedThisWeek / Math.max(1, active.length + completedThisWeek)) * 100);

    const riskFeed = atRiskRows
      .map((row) => {
        const riskReason = isOverdue(row) ? "overdue" : isUnassigned(row) ? "unassigned" : "stalled";
        const urgencyScore = riskReason === "overdue" ? 100 : riskReason === "unassigned" ? 80 : 60;
        return {
          id: row.id,
          projectId: row.projectId,
          clerkUserId: userId,
          title: row.title,
          description: row.description,
          ownerUserId: null,
          ownerDisplayName: row.owner?.trim() || null,
          source: "manual" as const,
          sourceReference: "",
          status: riskReason === "overdue" ? "overdue" : riskReason === "stalled" ? "at_risk" : "at_risk",
          priority: "medium" as const,
          createdAt: row.createdAt,
          dueDate: row.dueDate,
          lastUpdatedAt: row.updatedAt,
          activityLog: [],
          archivedAt: null,
          projectName: "Company",
          riskReason,
          urgencyScore,
        };
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 40);

    const overview = {
      summary: {
        activeTotal: active.length,
        pctCompletedThisWeek: completedPct,
        atRiskCount: atRiskRows.length,
        overdueCount: overdueRows.length,
        unassignedCount: unassignedRows.length,
      },
      riskFeed,
      teamLoad: teamLoad(rows).map((entry) => ({
        key: entry.owner.toLowerCase(),
        label: entry.owner,
        ownerUserId: null,
        activeCount: entry.activeCount,
        overloaded: entry.activeCount > 8,
      })),
      recentActivity: [],
      conflictingDeadlines: [],
    };
    return NextResponse.json({ overview });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

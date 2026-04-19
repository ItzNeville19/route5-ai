import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { isFigmaConfigured } from "@/lib/figma-api";
import { isGitHubConfigured } from "@/lib/github-api";
import { isLinearConfigured } from "@/lib/linear-api";
import type { OpenActionRef, RecentExtractionRow } from "@/lib/workspace-summary";
import {
  computeActivityStats,
  emptyActivitySeries,
  emptyExecutionMetrics,
} from "@/lib/workspace-activity-stats";
import { getWorkspaceSummaryForUser } from "@/lib/workspace/store";

export const runtime = "nodejs";

/**
 * Aggregates counts and recent activity for the signed-in user’s workspace dashboard.
 */
export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const { projectCount, extractionCount, recent, openActions, activity, activitySeries, execution } =
      await getWorkspaceSummaryForUser(userId, projectId);
    return NextResponse.json({
      projectCount,
      extractionCount,
      recent,
      openActions,
      activity,
      activitySeries,
      execution,
      readiness: {
        openai: isOpenAIConfigured(),
        linear: isLinearConfigured(),
        github: isGitHubConfigured(),
        figma: isFigmaConfigured(),
      },
    });
  } catch {
    return NextResponse.json({
      projectCount: 0,
      extractionCount: 0,
      recent: [] as RecentExtractionRow[],
      openActions: [] as OpenActionRef[],
      activity: computeActivityStats([]),
      activitySeries: emptyActivitySeries(),
      execution: emptyExecutionMetrics(),
      readiness: {
        openai: isOpenAIConfigured(),
        linear: isLinearConfigured(),
        github: isGitHubConfigured(),
        figma: isFigmaConfigured(),
      },
    });
  }
}

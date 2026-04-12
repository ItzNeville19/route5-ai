import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectCount, extractionCount, recent, openActions, activity, activitySeries, execution } =
      await getWorkspaceSummaryForUser(userId);
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

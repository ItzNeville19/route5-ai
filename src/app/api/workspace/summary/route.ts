import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { isGitHubConfigured } from "@/lib/github-api";
import { isLinearConfigured } from "@/lib/linear-api";
import type { RecentExtractionRow } from "@/lib/workspace-summary";
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
    const { projectCount, extractionCount, recent } =
      await getWorkspaceSummaryForUser(userId);
    return NextResponse.json({
      projectCount,
      extractionCount,
      recent,
      readiness: {
        openai: isOpenAIConfigured(),
        linear: isLinearConfigured(),
        github: isGitHubConfigured(),
      },
    });
  } catch {
    return NextResponse.json({
      projectCount: 0,
      extractionCount: 0,
      recent: [] as RecentExtractionRow[],
      readiness: {
        openai: isOpenAIConfigured(),
        linear: isLinearConfigured(),
        github: isGitHubConfigured(),
      },
    });
  }
}

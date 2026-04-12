import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { PaletteRecentRun, WorkspacePaletteProject } from "@/lib/command-palette-items";
import { getWorkspaceSummaryForUser, listPaletteProjectsForUser } from "@/lib/workspace/store";

export const runtime = "nodejs";

/**
 * Signed-in workspace context for the command palette (no secrets).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({
      signedIn: false,
      displayName: null as string | null,
      projects: [] as WorkspacePaletteProject[],
      recentRuns: [] as PaletteRecentRun[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }

  const user = await currentUser();
  const displayName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "You";

  try {
    const [projects, summary] = await Promise.all([
      listPaletteProjectsForUser(userId),
      getWorkspaceSummaryForUser(userId),
    ]);
    const recentRuns: PaletteRecentRun[] = summary.recent.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectName: r.projectName,
      snippet: r.summarySnippet,
    }));
    return NextResponse.json({
      signedIn: true,
      displayName,
      projects: projects as WorkspacePaletteProject[],
      recentRuns,
      openActionsCount: summary.openActions.length,
      workspaceDbOk: true,
    });
  } catch {
    return NextResponse.json({
      signedIn: true,
      displayName,
      projects: [] as WorkspacePaletteProject[],
      recentRuns: [] as PaletteRecentRun[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }
}

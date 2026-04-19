import { NextResponse } from "next/server";
import type { PaletteRecentRun, WorkspacePaletteProject } from "@/lib/command-palette-items";
import { isClerkFullyConfigured } from "@/lib/clerk-env";
import { getWorkspaceSummaryForUser, listPaletteProjectsForUser } from "@/lib/workspace/store";

export const runtime = "nodejs";

/**
 * Signed-in workspace context for the command palette (no secrets).
 */
export async function GET() {
  if (!isClerkFullyConfigured()) {
    return NextResponse.json({
      signedIn: false,
      displayName: null as string | null,
      primaryEmail: null as string | null,
      projects: [] as WorkspacePaletteProject[],
      recentRuns: [] as PaletteRecentRun[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }

  let userId: string | null = null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const a = await auth();
    userId = a.userId ?? null;
  } catch (e) {
    console.warn("[api/workspace/palette] auth() failed; returning signed-out payload.", e);
    return NextResponse.json({
      signedIn: false,
      displayName: null as string | null,
      primaryEmail: null as string | null,
      projects: [] as WorkspacePaletteProject[],
      recentRuns: [] as PaletteRecentRun[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }
  if (!userId) {
    return NextResponse.json({
      signedIn: false,
      displayName: null as string | null,
      primaryEmail: null as string | null,
      projects: [] as WorkspacePaletteProject[],
      recentRuns: [] as PaletteRecentRun[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }

  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const displayName =
    user?.firstName ||
    user?.username ||
    primaryEmail?.split("@")[0] ||
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
      primaryEmail,
      projects: projects as WorkspacePaletteProject[],
      recentRuns,
      openActionsCount: summary.openActions.length,
      workspaceDbOk: true,
    });
  } catch {
    return NextResponse.json({
      signedIn: true,
      displayName,
      primaryEmail,
      projects: [] as WorkspacePaletteProject[],
      recentRuns: [] as PaletteRecentRun[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }
}

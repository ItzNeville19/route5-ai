import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import type {
  PalettePerson,
  PaletteRecentRun,
  PaletteSearchCommitment,
  WorkspacePaletteProject,
} from "@/lib/command-palette-items";
import { isClerkFullyConfigured } from "@/lib/clerk-env";
import { getWorkspaceSummaryForUser, listPaletteProjectsForUser } from "@/lib/workspace/store";
import {
  getOrgCommitmentDetail,
  listDistinctOwnerIdsForOrg,
  listOrgCommitments,
} from "@/lib/org-commitments/repository";

export const runtime = "nodejs";

/**
 * Signed-in workspace context for the command palette (no secrets).
 * Optional `?projectId=` scopes commitments and summary to one company.
 */
export async function GET(req: Request) {
  if (!isClerkFullyConfigured()) {
    return NextResponse.json({
      signedIn: false,
      displayName: null as string | null,
      primaryEmail: null as string | null,
      projects: [] as WorkspacePaletteProject[],
      recentRuns: [] as PaletteRecentRun[],
      searchCommitments: [] as PaletteSearchCommitment[],
      people: [] as PalettePerson[],
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
      searchCommitments: [] as PaletteSearchCommitment[],
      people: [] as PalettePerson[],
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
      searchCommitments: [] as PaletteSearchCommitment[],
      people: [] as PalettePerson[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }

  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  const clerk = await clerkClient();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const displayName =
    user?.firstName ||
    user?.username ||
    primaryEmail?.split("@")[0] ||
    "You";

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const [projects, summary, commitments, ownerIds] = await Promise.all([
      listPaletteProjectsForUser(userId),
      getWorkspaceSummaryForUser(userId, projectId),
      listOrgCommitments(userId, {
        sort: "updated_at",
        order: "desc",
        ...(projectId ? { projectId } : {}),
      }),
      listDistinctOwnerIdsForOrg(userId),
    ]);
    const projectById = new Map(projects.map((p) => [p.id, p.name]));
    const recentRuns: PaletteRecentRun[] = summary.recent.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectName: r.projectName,
      snippet: r.summarySnippet,
    }));

    const top = commitments.slice(0, 120);
    const details = await Promise.all(
      top.map((c) => getOrgCommitmentDetail(userId, c.id).catch(() => null))
    );
    const searchCommitments: PaletteSearchCommitment[] = top.map((c, i) => {
      const d = details[i];
      const commentText = d ? d.comments.map((x) => x.content).join(" ") : "";
      const historyText = d
        ? d.history
            .map((x) => [x.fieldChanged, x.oldValue ?? "", x.newValue ?? ""].join(" "))
            .join(" ")
        : "";
      const searchText = [c.description ?? "", commentText, historyText]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        id: c.id,
        title: c.title,
        ownerName: c.ownerId,
        projectId: c.projectId,
        projectName: c.projectId ? projectById.get(c.projectId) ?? null : null,
        deadline: c.deadline,
        priority: c.priority,
        status: c.status,
        searchText,
      };
    });

    const ownerById = new Map<string, PalettePerson>();
    const ownerIdsLimited = [...new Set([userId, ...ownerIds])].slice(0, 32);
    for (const oid of ownerIdsLimited) {
      try {
        const u = await clerk.users.getUser(oid);
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
          u.username?.trim() ||
          u.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "Teammate";
        const email = u.primaryEmailAddress?.emailAddress ?? null;
        ownerById.set(oid, { id: oid, name, email });
      } catch {
        ownerById.set(oid, { id: oid, name: oid.slice(0, 8), email: null });
      }
    }
    for (const c of searchCommitments) {
      const p = ownerById.get(c.ownerName);
      if (p) c.ownerName = p.name;
    }
    const people = [...ownerById.values()];

    return NextResponse.json({
      signedIn: true,
      displayName,
      primaryEmail,
      projects: projects as WorkspacePaletteProject[],
      recentRuns,
      searchCommitments,
      people,
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
      searchCommitments: [] as PaletteSearchCommitment[],
      people: [] as PalettePerson[],
      openActionsCount: 0,
      workspaceDbOk: true,
    });
  }
}

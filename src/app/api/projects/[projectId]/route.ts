import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  getProjectDetailForUser,
  updateProjectForUser,
} from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;

  try {
    const detail = await getProjectDetailForUser(userId, projectId);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      project: detail.project,
      extractions: detail.extractions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;
  let body: { name?: unknown; iconEmoji?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: { name?: string; iconEmoji?: string | null } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (body.iconEmoji === null || typeof body.iconEmoji === "string") {
    patch.iconEmoji = body.iconEmoji === null ? null : body.iconEmoji;
  }

  if (patch.name === undefined && patch.iconEmoji === undefined) {
    return NextResponse.json(
      { error: "Provide name and/or iconEmoji" },
      { status: 400 }
    );
  }

  try {
    const project = await updateProjectForUser(userId, projectId, patch);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_NAME") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

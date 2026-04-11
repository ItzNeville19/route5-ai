import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import type { ActionItemStored } from "@/lib/ai/schema";
import { updateExtractionActions } from "@/lib/workspace/store";

export const runtime = "nodejs";

function parseBodyActionItems(raw: unknown): ActionItemStored[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ActionItemStored[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const text = typeof o.text === "string" ? o.text : "";
    if (!id || !text) return null;
    const owner =
      o.owner === null || o.owner === undefined
        ? null
        : typeof o.owner === "string"
          ? o.owner
          : null;
    out.push({
      id,
      text,
      owner,
      completed: Boolean(o.completed),
    });
  }
  return out;
}

export async function PATCH(
  req: Request,
  ctx: {
    params: Promise<{ projectId: string; extractionId: string }>;
  }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, extractionId } = await ctx.params;

  let body: { actionItems?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actionItems = parseBodyActionItems(body.actionItems);
  if (!actionItems) {
    return NextResponse.json(
      { error: "actionItems must be a valid array" },
      { status: 400 }
    );
  }

  try {
    await updateExtractionActions({
      userId,
      projectId,
      extractionId,
      actionItems,
    });
    return NextResponse.json({
      extractionId,
      actionItems,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import type { ActionItemStored } from "@/lib/ai/schema";
import { updateExtractionActions } from "@/lib/workspace/store";
import {
  cleanText,
  enforceRateLimits,
  isWorkspaceResourceId,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const actionItemSchema = z
  .object({
    id: z.string().transform(cleanText).pipe(z.string().min(1).max(120)),
    text: z.string().transform(cleanText).pipe(z.string().min(1).max(500)),
    owner: z.union([z.string().transform(cleanText).pipe(z.string().max(120)), z.null()]).optional(),
    completed: z.boolean(),
  })
  .strict();

const extractionPatchSchema = z
  .object({
    actionItems: z.array(actionItemSchema).max(200),
  })
  .strict();

export async function PATCH(
  req: Request,
  ctx: {
    params: Promise<{ projectId: string; extractionId: string }>;
  }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "extraction:patch", userId, {
      userLimit: 30,
      ipLimit: 60,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId, extractionId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId) || !isWorkspaceResourceId(extractionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const parsed = await parseJsonBody(req, extractionPatchSchema);
  if (!parsed.ok) return parsed.response;
  const actionItems: ActionItemStored[] = parsed.data.actionItems.map((item) => ({
    id: item.id,
    text: item.text,
    owner: item.owner ?? null,
    completed: item.completed,
  }));

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

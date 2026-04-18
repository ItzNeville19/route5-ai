import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  deleteCommitmentForUser,
  updateCommitmentForUser,
} from "@/lib/workspace/store";
import {
  enforceRateLimits,
  isWorkspaceResourceId,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    title: z.string().min(1).max(2000).optional(),
    description: z.string().max(20_000).optional().nullable(),
    ownerUserId: z.string().max(128).optional().nullable(),
    ownerDisplayName: z.string().max(200).optional().nullable(),
    status: z.enum(["active", "at_risk", "overdue", "completed"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.string().max(48).optional().nullable(),
    note: z.string().min(1).max(20_000).optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; commitmentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "commitments:patch", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId, commitmentId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId) || !isWorkspaceResourceId(commitmentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = await parseJsonBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const commitment = await updateCommitmentForUser(userId, projectId, commitmentId, parsed.data);
    if (!commitment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ commitment });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ projectId: string; commitmentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "commitments:delete", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId, commitmentId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId) || !isWorkspaceResourceId(commitmentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const ok = await deleteCommitmentForUser(userId, projectId, commitmentId);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

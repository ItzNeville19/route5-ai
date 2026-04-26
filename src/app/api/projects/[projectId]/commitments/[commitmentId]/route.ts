import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  deleteCommitment,
  fetchCommitments,
  updateCommitment,
} from "@/lib/commitments/repository";
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
    owner: z.string().max(200).optional().nullable(),
    status: z.enum(["pending", "in_progress", "done"]).optional(),
    dueDate: z.string().max(48).optional().nullable(),
  })
  .strict();

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; commitmentId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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
    const existing = await fetchCommitments(userId, { projectId });
    if (!existing.some((row) => row.id === commitmentId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const commitment = await updateCommitment(userId, commitmentId, parsed.data);
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
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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
    const existing = await fetchCommitments(userId, { projectId });
    if (!existing.some((row) => row.id === commitmentId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ok = await deleteCommitment(userId, commitmentId);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import {
  getOrgCommitmentDetail,
  softDeleteOrgCommitment,
  updateOrgCommitment,
} from "@/lib/org-commitments/repository";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { notifyOrgCommitmentAssignment } from "@/lib/org-commitments/notify-assignment";
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
    ownerId: z.string().min(1).max(128).optional(),
    deadline: z.string().min(1).max(48).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    completed: z.boolean().optional(),
  })
  .strict();

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isWorkspaceResourceId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const detail = await getOrgCommitmentDetail(userId, id);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ orgId, commitment: detail });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:patch", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;
  if (!isWorkspaceResourceId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = await parseJsonBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const patch = parsed.data;
    const { row, previousOwnerId } = await updateOrgCommitment(userId, id, {
      title: patch.title,
      description: patch.description,
      ownerId: patch.ownerId,
      deadline: patch.deadline ? new Date(patch.deadline).toISOString() : undefined,
      priority: patch.priority,
      completed: patch.completed,
    });
    broadcastOrgCommitmentEvent(orgId, { kind: "commitment_updated", id });
    if (
      patch.ownerId &&
      patch.ownerId !== previousOwnerId &&
      patch.ownerId !== userId
    ) {
      void notifyOrgCommitmentAssignment({
        ownerClerkId: patch.ownerId,
        title: row.title,
        deadline: row.deadline,
        priority: row.priority,
        commitmentId: row.id,
      });
    }
    return NextResponse.json({ commitment: row });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:delete", userId, {
      userLimit: 40,
      ipLimit: 80,
    })
  );
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;
  if (!isWorkspaceResourceId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const ok = await softDeleteOrgCommitment(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    broadcastOrgCommitmentEvent(orgId, { kind: "commitment_deleted", id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

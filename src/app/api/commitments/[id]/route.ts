import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
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
import { verifyProjectOwned } from "@/lib/workspace/store";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    title: z.string().min(1).max(2000).optional(),
    description: z.string().max(20_000).optional().nullable(),
    ownerId: z.string().min(1).max(128).optional(),
    projectId: z.string().uuid().nullable().optional(),
    deadline: z.string().min(1).max(48).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    status: z.enum(["not_started", "in_progress", "on_track", "at_risk", "overdue", "completed"]).optional(),
    completed: z.boolean().optional(),
  })
  .strict();

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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
    if (patch.projectId) {
      const owned = await verifyProjectOwned(userId, patch.projectId);
      if (!owned) {
        return NextResponse.json({ error: "Invalid project" }, { status: 400 });
      }
    }
    const { row, previousOwnerId } = await updateOrgCommitment(userId, id, {
      title: patch.title,
      description: patch.description,
      ownerId: patch.ownerId,
      projectId: patch.projectId,
      deadline: patch.deadline ? new Date(patch.deadline).toISOString() : undefined,
      priority: patch.priority,
      status: patch.status,
      completed: patch.completed,
    });
    broadcastOrgCommitmentEvent(orgId, { kind: "commitment_updated", id });
    if (
      patch.ownerId &&
      patch.ownerId !== previousOwnerId &&
      patch.ownerId !== userId
    ) {
      void notifyOrgCommitmentAssignment({
        orgId,
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
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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

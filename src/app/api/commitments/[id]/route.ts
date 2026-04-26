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
    due_date: z.string().max(48).optional().nullable(),
    status: z
      .enum(["pending", "accepted", "in_progress", "blocked", "done", "reopened"])
      .optional(),
    blocker_reason: z.string().max(1000).optional().nullable(),
    completion_note: z.string().max(5000).optional().nullable(),
    completion_proof_url: z.string().url().max(2000).optional().nullable(),
    manager_decision: z.enum(["approve", "reopen"]).optional().nullable(),
    manager_comment: z.string().max(2000).optional().nullable(),
    due_date_request: z
      .object({
        requestedDate: z.string().max(64),
        reason: z.string().max(1000).optional().nullable(),
      })
      .optional()
      .nullable(),
    due_date_request_decision: z
      .object({
        action: z.enum(["approve", "reject"]),
        comment: z.string().max(2000).optional().nullable(),
      })
      .optional()
      .nullable(),
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
    const commitments = await fetchCommitments(userId);
    const commitment = commitments.find((row) => row.id === id);
    if (!commitment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ commitment });
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
    userAndIpRateScopes(req, "commitments:patch", userId, {
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
    const patch = parsed.data;
    if (patch.due_date) {
      const due = new Date(patch.due_date).getTime();
      if (!Number.isFinite(due)) {
        return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
      }
    }
    const row = await updateCommitment(userId, id, {
      title: patch.title,
      description: patch.description,
      owner: patch.owner,
      dueDate: patch.due_date,
      status: patch.status,
      blockerReason: patch.blocker_reason,
      completionNote: patch.completion_note,
      completionProofUrl: patch.completion_proof_url,
      managerDecision: patch.manager_decision,
      managerComment: patch.manager_comment,
      dueDateRequest: patch.due_date_request,
      dueDateRequestDecision: patch.due_date_request_decision,
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    userAndIpRateScopes(req, "commitments:delete", userId, {
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
    const ok = await deleteCommitment(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
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
import { requireOrgRole } from "@/lib/workspace/org-members";

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
  const orgAccess = await requireOrgRole(userId, ["admin", "manager", "member"]);
  if (!orgAccess.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (orgAccess.role === "member") {
      const existing = (await fetchCommitments(userId)).find((row) => row.id === id);
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const clerk = await clerkClient();
      const me = await clerk.users.getUser(userId);
      const allowedOwners = [
        me.fullName?.trim(),
        me.firstName?.trim(),
        [me.firstName, me.lastName].filter(Boolean).join(" ").trim(),
        me.primaryEmailAddress?.emailAddress?.split("@")[0]?.trim(),
      ]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase());
      const owner = existing.owner?.trim().toLowerCase() ?? "";
      if (!owner || !allowedOwners.includes(owner)) {
        return NextResponse.json(
          { error: "Members can only update commitments assigned to them." },
          { status: 403 }
        );
      }
      if (
        patch.owner !== undefined ||
        patch.manager_decision !== undefined ||
        patch.manager_comment !== undefined ||
        patch.due_date_request_decision !== undefined ||
        patch.due_date !== undefined
      ) {
        return NextResponse.json({ error: "Admin approval required for this action." }, { status: 403 });
      }
    }
    if (patch.status === "blocked" && !patch.blocker_reason?.trim()) {
      return NextResponse.json({ error: "Blocked status requires a blocker reason." }, { status: 400 });
    }
    if (patch.status === "done" && !patch.completion_note?.trim() && !patch.completion_proof_url?.trim()) {
      return NextResponse.json(
        { error: "Completion proof or note is required before marking done." },
        { status: 400 }
      );
    }
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
  const orgAccess = await requireOrgRole(userId, ["admin", "manager"]);
  if (!orgAccess.ok) {
    return NextResponse.json({ error: "Only admins or managers can delete commitments." }, { status: 403 });
  }
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

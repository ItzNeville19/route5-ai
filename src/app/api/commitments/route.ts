import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getProjectDetailForUser } from "@/lib/workspace/store";
import {
  createOrgCommitment,
  listOrgCommitments,
} from "@/lib/org-commitments/repository";
import type { OrgCommitmentListSort } from "@/lib/org-commitment-types";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { notifyOrgCommitmentAssignment } from "@/lib/org-commitments/notify-assignment";
import {
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";
import { checkPlanLimit, planLimitResponse } from "@/lib/billing/gate";
import { requireOrgRole } from "@/lib/workspace/org-members";

export const runtime = "nodejs";

const prioritySchema = z.enum(["critical", "high", "medium", "low"]);

const postSchema = z
  .object({
    title: z.string().min(1).max(2000),
    description: z.string().max(20_000).optional().nullable(),
    ownerId: z.string().min(1).max(128),
    deadline: z.string().min(1).max(64),
    priority: prioritySchema,
    /** Optional link to a workspace company (project) the user can access. */
    projectId: z.string().uuid().optional(),
  })
  .strict();

function deadlineInPast(deadlineIso: string): boolean {
  const t = new Date(deadlineIso).getTime();
  return Number.isFinite(t) && t < Date.now();
}

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:list", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const sort = (url.searchParams.get("sort") ?? "deadline") as OrgCommitmentListSort;
  const order = url.searchParams.get("order") === "desc" ? "desc" : "asc";

  try {
    const roleAccess = await requireOrgRole(userId, ["admin", "manager", "member"]);
    if (!roleAccess.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const orgId = await ensureOrganizationForClerkUser(userId);
    const requestedOwner = url.searchParams.get("owner") ?? undefined;
    const ownerScope =
      roleAccess.role === "admin"
        ? requestedOwner
        : userId;
    const commitments = await listOrgCommitments(userId, {
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      owner: ownerScope,
      projectId: url.searchParams.get("projectId") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      sort,
      order,
    });
    return NextResponse.json({ orgId, commitments });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:post", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, postSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  if (deadlineInPast(body.deadline)) {
    return NextResponse.json(
      { error: "Deadline cannot be in the past" },
      { status: 400 }
    );
  }

  try {
    const roleAccess = await requireOrgRole(userId, ["admin", "manager", "member"]);
    if (!roleAccess.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const orgId = await ensureOrganizationForClerkUser(userId);
    const gate = await checkPlanLimit(orgId, "commitments");
    if (!gate.allowed && gate.upgrade) {
      return planLimitResponse(gate.upgrade);
    }
    let scopedProjectId: string | null = null;
    if (body.projectId) {
      const project = await getProjectDetailForUser(userId, body.projectId);
      if (!project) {
        return NextResponse.json({ error: "Company not found" }, { status: 400 });
      }
      scopedProjectId = body.projectId;
    }
    const ownerId = roleAccess.role === "admin" ? body.ownerId : userId;
    const row = await createOrgCommitment(userId, {
      title: body.title,
      description: body.description ?? null,
      ownerId,
      projectId: scopedProjectId,
      deadline: new Date(body.deadline).toISOString(),
      priority: body.priority,
    });
    broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
    if (ownerId !== userId) {
      void notifyOrgCommitmentAssignment({
        orgId,
        ownerClerkId: ownerId,
        title: body.title,
        deadline: row.deadline,
        priority: body.priority,
        commitmentId: row.id,
      });
    }
    return NextResponse.json({ commitment: row });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

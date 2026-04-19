import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
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
import { isSupabaseConfigured } from "@/lib/supabase-env";

export const runtime = "nodejs";

const prioritySchema = z.enum(["critical", "high", "medium", "low"]);

const postSchema = z
  .object({
    title: z.string().min(1).max(2000),
    description: z.string().max(20_000).optional().nullable(),
    ownerId: z.string().min(1).max(128),
    deadline: z.string().min(1).max(48),
    priority: prioritySchema,
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
    const orgId = await ensureOrganizationForClerkUser(userId);
    const commitments = await listOrgCommitments(userId, {
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      owner: url.searchParams.get("owner") ?? undefined,
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
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Durable storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before creating commitments.",
      },
      { status: 503 }
    );
  }
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
    const orgId = await ensureOrganizationForClerkUser(userId);
    const gate = await checkPlanLimit(orgId, "commitments");
    if (!gate.allowed && gate.upgrade) {
      return planLimitResponse(gate.upgrade);
    }
    const row = await createOrgCommitment(userId, {
      title: body.title,
      description: body.description ?? null,
      ownerId: body.ownerId,
      deadline: new Date(body.deadline).toISOString(),
      priority: body.priority,
    });
    broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
    if (body.ownerId !== userId) {
      void notifyOrgCommitmentAssignment({
        orgId,
        ownerClerkId: body.ownerId,
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

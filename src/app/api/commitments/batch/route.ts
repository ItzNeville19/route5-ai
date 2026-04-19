import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { createOrgCommitment } from "@/lib/org-commitments/repository";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { notifyOrgCommitmentAssignment } from "@/lib/org-commitments/notify-assignment";
import {
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";
import { countActiveCommitments } from "@/lib/billing/store";
import { PLAN_LIMITS, planDisplayName, recommendedPlanAfterLimit } from "@/lib/billing/plans";
import { resolveEffectiveBillingPlan } from "@/lib/billing/resolve-plan";
import type { BillingPlanId } from "@/lib/billing/types";

export const runtime = "nodejs";

const prioritySchema = z.enum(["critical", "high", "medium", "low"]);

const itemSchema = z
  .object({
    title: z.string().min(1).max(2000),
    description: z.string().max(20_000).optional().nullable(),
    ownerId: z.string().min(1).max(128),
    deadline: z.string().min(1).max(48),
    priority: prioritySchema,
  })
  .strict();

const batchSchema = z
  .object({
    items: z.array(itemSchema).min(1).max(25),
  })
  .strict();

function deadlineInPast(deadlineIso: string): boolean {
  const t = new Date(deadlineIso).getTime();
  return Number.isFinite(t) && t < Date.now();
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:batch", userId, {
      userLimit: 30,
      ipLimit: 60,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, batchSchema);
  if (!parsed.ok) return parsed.response;

  const { items } = parsed.data;
  for (const it of items) {
    if (deadlineInPast(it.deadline)) {
      return NextResponse.json(
        { error: "Deadline cannot be in the past", title: it.title },
        { status: 400 }
      );
    }
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const plan: BillingPlanId = await resolveEffectiveBillingPlan(orgId);
    const cap = PLAN_LIMITS[plan].commitments;
    const cur = await countActiveCommitments(orgId);
    if (Number.isFinite(cap) && cur + items.length > cap) {
      return NextResponse.json(
        {
          error: "plan_limit",
          message: `Adding ${items.length} commitment(s) would exceed ${planDisplayName(plan)} (${cap} active).`,
          upgrade: {
            currentPlan: plan,
            limitHit: "commitments" as const,
            recommendedPlan: recommendedPlanAfterLimit(plan, "commitments"),
            message: `You’ve reached the commitment limit for ${planDisplayName(plan)}. Upgrade to add more.`,
          },
        },
        { status: 409 }
      );
    }

    const created: Awaited<ReturnType<typeof createOrgCommitment>>[] = [];
    for (const it of items) {
      const row = await createOrgCommitment(userId, {
        title: it.title,
        description: it.description ?? null,
        ownerId: it.ownerId,
        deadline: new Date(it.deadline).toISOString(),
        priority: it.priority,
      });
      broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
      if (it.ownerId !== userId) {
        void notifyOrgCommitmentAssignment({
          orgId,
          ownerClerkId: it.ownerId,
          title: it.title,
          deadline: row.deadline,
          priority: it.priority,
          commitmentId: row.id,
        });
      }
      created.push(row);
    }

    return NextResponse.json({ commitments: created, count: created.length });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

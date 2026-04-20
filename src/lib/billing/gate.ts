import { PLAN_LIMITS, planDisplayName, recommendedPlanAfterLimit } from "@/lib/billing/plans";
import {
  countActiveCommitments,
  countConnectedIntegrations,
  getLatestUsageValue,
  getOrgSubscription,
} from "@/lib/billing/store";
import { resolveEffectiveBillingPlan } from "@/lib/billing/resolve-plan";
import { NextResponse } from "next/server";
import type { BillingFeature, BillingPlanId, UpgradePromptPayload } from "@/lib/billing/types";

export type PlanLimitResult = {
  allowed: boolean;
  reason: string;
  upgrade?: UpgradePromptPayload;
};

function isUnlimited(n: number): boolean {
  return !Number.isFinite(n);
}

function buildUpgrade(
  plan: BillingPlanId,
  hit: BillingFeature,
  message: string
): UpgradePromptPayload {
  return {
    currentPlan: plan,
    limitHit: hit,
    recommendedPlan: recommendedPlanAfterLimit(plan, hit),
    message,
  };
}

export async function checkPlanLimit(
  orgId: string,
  feature: BillingFeature
): Promise<PlanLimitResult> {
  const plan = await resolveEffectiveBillingPlan(orgId);
  const limits = PLAN_LIMITS[plan];

  if (feature === "commitments") {
    const n = await countActiveCommitments(orgId);
    if (!isUnlimited(limits.commitments) && n >= limits.commitments) {
      return {
        allowed: false,
        reason: `Commitment limit reached for ${planDisplayName(plan)} (${limits.commitments}).`,
        upgrade: buildUpgrade(
          plan,
          "commitments",
          `You’ve reached the commitment limit for ${planDisplayName(plan)} (${limits.commitments}). Contact neville@rayze.xyz to continue.`
        ),
      };
    }
    return { allowed: true, reason: "" };
  }

  if (feature === "integrations") {
    const n = await countConnectedIntegrations(orgId);
    if (!isUnlimited(limits.integrations) && n >= limits.integrations) {
      return {
        allowed: false,
        reason: `Integration limit reached for ${planDisplayName(plan)} (${limits.integrations}).`,
        upgrade: buildUpgrade(
          plan,
          "integrations",
          `You’ve reached the integration limit for ${planDisplayName(plan)}. Contact neville@rayze.xyz to continue.`
        ),
      };
    }
    return { allowed: true, reason: "" };
  }

  if (feature === "export") {
    if (!limits.dashboardExport) {
      return {
        allowed: false,
        reason: "Dashboard export requires a paid plan.",
        upgrade: buildUpgrade(
          plan,
          "export",
          "Dashboard export is not included on Free. Contact neville@rayze.xyz to continue."
        ),
      };
    }
    return { allowed: true, reason: "" };
  }

  if (feature === "seats") {
    if (plan === "enterprise") {
      return { allowed: true, reason: "" };
    }
    const sub = await getOrgSubscription(orgId);
    const latest = await getLatestUsageValue(orgId, "seats");
    const used = latest ?? 1;
    const planCap = limits.seats;
    const purchased = Math.max(sub?.seatCount ?? 1, 1);
    const effectiveCap = isUnlimited(planCap) ? purchased : Math.min(planCap, purchased);
    if (used >= effectiveCap) {
      return {
        allowed: false,
        reason: `Seat limit reached for ${planDisplayName(plan)}.`,
        upgrade: buildUpgrade(
          plan,
          "seats",
          `You’ve reached the seat limit for ${planDisplayName(plan)}. Contact neville@rayze.xyz to continue.`
        ),
      };
    }
    return { allowed: true, reason: "" };
  }

  return { allowed: true, reason: "" };
}

export function planLimitResponse(upgrade: UpgradePromptPayload): NextResponse {
  return NextResponse.json(
    {
      error: "plan_limit",
      message: upgrade.message,
      upgrade,
    },
    { status: 409 }
  );
}

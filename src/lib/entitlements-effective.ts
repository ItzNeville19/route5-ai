import { resolveTierForUser, type PlanTierId } from "@/lib/entitlements";
import { resolveEffectiveBillingPlan } from "@/lib/billing/resolve-plan";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";

const RANK: Record<PlanTierId, number> = {
  free: 0,
  pro: 1,
  ultra: 2,
  enterprise: 3,
};

function billingPlanToTier(plan: string): PlanTierId {
  if (plan === "starter") return "pro";
  if (plan === "growth") return "ultra";
  if (plan === "enterprise") return "enterprise";
  return "free";
}

/**
 * Returns the strongest tier from env entitlements and active billing plan.
 * Prevents paid users from being treated as Free when env overrides are absent.
 */
export async function resolveEffectiveTierForUser(
  userId: string,
  email?: string
): Promise<PlanTierId> {
  const envTier = resolveTierForUser(userId, email);
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const billingPlan = await resolveEffectiveBillingPlan(orgId);
    const billingTier = billingPlanToTier(billingPlan);
    return RANK[billingTier] > RANK[envTier] ? billingTier : envTier;
  } catch {
    return envTier;
  }
}

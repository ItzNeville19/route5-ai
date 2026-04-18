import type { BillingPlanId } from "@/lib/billing/types";
import { getOrganizationPlanColumn, getOrgSubscription } from "@/lib/billing/store";

/**
 * Effective billing plan for workspace limits and UI.
 * Stripe subscription row wins when status is active, trialing, or past_due.
 * `organizations.plan` may be set to enterprise manually (no Stripe product).
 */
export async function resolveEffectiveBillingPlan(orgId: string): Promise<BillingPlanId> {
  const orgPlanRaw = await getOrganizationPlanColumn(orgId);
  if (orgPlanRaw === "enterprise") {
    return "enterprise";
  }
  const sub = await getOrgSubscription(orgId);
  if (sub && ["active", "trialing", "past_due"].includes(sub.status)) {
    return sub.plan;
  }
  if (orgPlanRaw === "starter" || orgPlanRaw === "growth") {
    return orgPlanRaw;
  }
  return "free";
}

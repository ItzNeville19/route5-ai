import type { BillingPlanId } from "@/lib/billing/types";
import {
  getOrganizationCreatedAt,
  getOrganizationPlanColumn,
  getOrgSubscription,
} from "@/lib/billing/store";

const CONTACT_ONLY_TRIAL_DAYS = 3;

/**
 * Effective billing plan for workspace limits and UI.
 * Stripe subscription row wins when status is active, trialing, or past_due.
 * `organizations.plan` may be set to enterprise manually (no Stripe product).
 */
export async function resolveEffectiveBillingPlan(orgId: string): Promise<BillingPlanId> {
  const orgPlanRaw = await getOrganizationPlanColumn(orgId);
  if (orgPlanRaw === "enterprise" || orgPlanRaw.toLowerCase().includes("enterprise")) {
    return "enterprise";
  }
  const sub = await getOrgSubscription(orgId);
  if (sub?.plan === "enterprise" && sub.status !== "cancelled") {
    return "enterprise";
  }
  if (sub && ["active", "trialing", "past_due"].includes(sub.status)) {
    return sub.plan;
  }
  // Contact-first onboarding: all workspaces start with a 3-day cardless trial.
  const createdAt = await getOrganizationCreatedAt(orgId);
  if (createdAt) {
    const createdMs = new Date(createdAt).getTime();
    if (Number.isFinite(createdMs)) {
      const withinTrial = Date.now() - createdMs < CONTACT_ONLY_TRIAL_DAYS * 24 * 60 * 60 * 1000;
      if (withinTrial) return "starter";
    }
  }
  if (orgPlanRaw === "starter" || orgPlanRaw === "growth") {
    return orgPlanRaw;
  }
  return "free";
}

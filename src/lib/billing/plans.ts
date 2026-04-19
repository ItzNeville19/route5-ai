import type { BillingPlanId, BillingFeature } from "@/lib/billing/types";

export const PLAN_LIMITS: Record<
  BillingPlanId,
  {
    commitments: number;
    seats: number;
    integrations: number;
    dashboardExport: boolean;
  }
> = {
  free: { commitments: 3, seats: 1, integrations: 0, dashboardExport: false },
  starter: { commitments: 50, seats: 5, integrations: 2, dashboardExport: true },
  growth: {
    commitments: Number.POSITIVE_INFINITY,
    seats: 25,
    integrations: Number.POSITIVE_INFINITY,
    dashboardExport: true,
  },
  enterprise: {
    commitments: Number.POSITIVE_INFINITY,
    seats: Number.POSITIVE_INFINITY,
    integrations: Number.POSITIVE_INFINITY,
    dashboardExport: true,
  },
};

export const PLAN_ORDER: BillingPlanId[] = ["free", "starter", "growth", "enterprise"];

export function planDisplayName(plan: BillingPlanId): string {
  switch (plan) {
    case "free":
      return "Free";
    case "starter":
      return "Starter";
    case "growth":
      return "Growth";
    case "enterprise":
      return "Enterprise";
    default:
      return plan;
  }
}

/** Next paid tier to recommend when a limit is hit. */
export function recommendedPlanAfterLimit(
  current: BillingPlanId,
  hit: BillingFeature
): BillingPlanId {
  void hit;
  if (current === "free") return "starter";
  if (current === "starter") return "growth";
  if (current === "growth") return "enterprise";
  return "enterprise";
}

export const CHECKOUT_PRICES: Record<
  "starter" | "growth",
  { monthly: string | undefined; annual: string | undefined }
> = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim(),
    annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID?.trim(),
  },
  growth: {
    monthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID?.trim(),
    annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID?.trim(),
  },
};

export function planFromStripePriceId(priceId: string | null | undefined): BillingPlanId | null {
  const p = priceId?.trim();
  if (!p) return null;
  const pairs: [string | undefined, BillingPlanId][] = [
    [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim(), "starter"],
    [process.env.STRIPE_STARTER_ANNUAL_PRICE_ID?.trim(), "starter"],
    [process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID?.trim(), "growth"],
    [process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID?.trim(), "growth"],
  ];
  for (const [id, plan] of pairs) {
    if (id && id === p) return plan;
  }
  return null;
}

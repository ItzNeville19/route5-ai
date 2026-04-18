export type BillingPlanId = "free" | "starter" | "growth" | "enterprise";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"
  | "incomplete";

export type OrgInvoiceStatus = "paid" | "open" | "void" | "uncollectible";

export type UsageMetric = "seats" | "commitments" | "integrations";

export type BillingFeature = "commitments" | "integrations" | "export" | "seats";

export type OrgSubscriptionRow = {
  id: string;
  orgId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: BillingPlanId;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  trialEnd: string | null;
  seatCount: number;
  paymentFailedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrgInvoiceRow = {
  id: string;
  orgId: string;
  stripeInvoiceId: string;
  stripePaymentIntentId: string | null;
  amountCents: number;
  currency: string;
  status: OrgInvoiceStatus;
  invoiceUrl: string | null;
  invoicePdfUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
};

export type UpgradePromptPayload = {
  currentPlan: BillingPlanId;
  limitHit: BillingFeature;
  recommendedPlan: BillingPlanId;
  message: string;
};

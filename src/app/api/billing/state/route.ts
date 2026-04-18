import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PLAN_LIMITS, planDisplayName } from "@/lib/billing/plans";
import { resolveEffectiveBillingPlan } from "@/lib/billing/resolve-plan";
import {
  countActiveCommitments,
  countConnectedIntegrations,
  ensureSeatUsageInitialized,
  getLatestUsageValue,
  getOrgSubscription,
  listOrgInvoices,
} from "@/lib/billing/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const sub = await getOrgSubscription(orgId);
    await ensureSeatUsageInitialized(orgId, sub?.seatCount ?? 1);

    const plan = await resolveEffectiveBillingPlan(orgId);
    const limits = PLAN_LIMITS[plan];
    const commitments = await countActiveCommitments(orgId);
    const integrations = await countConnectedIntegrations(orgId);
    const seatsUsed = (await getLatestUsageValue(orgId, "seats")) ?? 1;

    const invoices = await listOrgInvoices(orgId);

    const commitmentCap = Number.isFinite(limits.commitments) ? limits.commitments : null;
    const integrationCap = Number.isFinite(limits.integrations) ? limits.integrations : null;
    const purchased = Math.max(sub?.seatCount ?? 1, 1);
    const seatCap = Number.isFinite(limits.seats)
      ? Math.min(limits.seats, purchased)
      : purchased;

    return NextResponse.json({
      orgId,
      plan,
      planLabel: planDisplayName(plan),
      subscription: sub
        ? {
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            trialEnd: sub.trialEnd,
            seatCount: sub.seatCount,
            stripeCustomerId: sub.stripeCustomerId,
          }
        : null,
      paymentIssue: Boolean(sub?.paymentFailedAt) || sub?.status === "past_due",
      usage: {
        commitments: { used: commitments, limit: commitmentCap },
        integrations: { used: integrations, limit: integrationCap },
        seats: { used: seatsUsed, limit: seatCap },
      },
      limits: {
        dashboardExport: limits.dashboardExport,
      },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        createdAt: inv.createdAt,
        amountCents: inv.amountCents,
        currency: inv.currency,
        status: inv.status,
        invoicePdfUrl: inv.invoicePdfUrl,
        invoiceUrl: inv.invoiceUrl,
      })),
    });
  } catch (e) {
    console.error("billing state", e);
    const limits = PLAN_LIMITS.free;
    return NextResponse.json(
      {
        degraded: true,
        orgId: null,
        plan: "free" as const,
        planLabel: planDisplayName("free"),
        subscription: null,
        paymentIssue: false,
        usage: {
          commitments: { used: 0, limit: limits.commitments },
          integrations: { used: 0, limit: limits.integrations },
          seats: { used: 1, limit: limits.seats },
        },
        limits: {
          dashboardExport: limits.dashboardExport,
        },
        invoices: [],
      },
      { status: 200 }
    );
  }
}

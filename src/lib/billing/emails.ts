import { clerkClient } from "@clerk/nextjs/server";
import { sendOperationalEmail } from "@/lib/notify-resend";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { appBaseUrl } from "@/lib/billing/stripe-client";
import { getOrgSubscription } from "@/lib/billing/store";
import { planDisplayName } from "@/lib/billing/plans";
import { sendNotification } from "@/lib/notifications/service";

async function ownerEmail(orgId: string): Promise<string | null> {
  const ownerId = await getOrganizationClerkUserId(orgId);
  if (!ownerId) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(ownerId);
    return (
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null
    );
  } catch {
    return null;
  }
}

export async function sendPaymentSucceededEmail(params: {
  orgId: string;
  amountCents: number;
  currency: string;
  periodLabel: string;
  invoicePdfUrl: string | null;
}): Promise<void> {
  const to = await ownerEmail(params.orgId);
  if (!to) return;
  const amount = (params.amountCents / 100).toFixed(2);
  const cur = params.currency.toUpperCase();
  const base = appBaseUrl();
  const portal = `${base}/api/billing/portal`;
  const lines = [
    `Payment received — thank you.`,
    ``,
    `Amount: ${cur} ${amount}`,
    `Period: ${params.periodLabel}`,
    params.invoicePdfUrl ? `Invoice PDF: ${params.invoicePdfUrl}` : null,
    ``,
    `Manage billing: open the app → Workspace → Billing, or visit ${portal} (signed in).`,
  ].filter(Boolean);
  await sendOperationalEmail({
    to,
    subject: `[Route5] Payment receipt — ${cur} ${amount}`,
    text: lines.join("\n"),
  });
}

export async function sendPaymentFailedEmail(params: { orgId: string }): Promise<void> {
  const ownerId = await getOrganizationClerkUserId(params.orgId);
  if (!ownerId) return;
  const base = appBaseUrl();
  await sendNotification({
    orgId: params.orgId,
    userId: ownerId,
    type: "payment_failed",
    title: "Payment failed — update your payment method",
    body: `We couldn’t process your latest Route5 subscription payment. Update your payment method in Billing to avoid losing access.`,
    metadata: { link: `${base}/workspace/billing` },
  });
}

export async function sendSubscriptionCancelledEmail(params: {
  orgId: string;
  accessEndDate: string | null;
}): Promise<void> {
  const ownerId = await getOrganizationClerkUserId(params.orgId);
  if (!ownerId) return;
  const sub = await getOrgSubscription(params.orgId);
  const planName = sub ? planDisplayName(sub.plan) : "your plan";
  const base = appBaseUrl();
  await sendNotification({
    orgId: params.orgId,
    userId: ownerId,
    type: "subscription_cancelled",
    title: "Subscription cancelled",
    body: params.accessEndDate
      ? `Your ${planName} subscription was cancelled. Paid access remains until ${params.accessEndDate}.`
      : `Your ${planName} subscription was cancelled. Your workspace will move to the Free plan.`,
    metadata: {
      link: `${base}/workspace/billing`,
      planName,
      accessEndDate: params.accessEndDate,
    },
  });
}

export async function sendTrialEndingEmail(params: {
  orgId: string;
  trialEnd: string;
}): Promise<void> {
  const ownerId = await getOrganizationClerkUserId(params.orgId);
  if (!ownerId) return;
  const base = appBaseUrl();
  let daysNote = "";
  try {
    const end = new Date(params.trialEnd).getTime();
    const d = Math.ceil((end - Date.now()) / 86_400_000);
    if (d >= 0) daysNote = ` (${d} day${d === 1 ? "" : "s"} remaining)`;
  } catch {
    /* ignore */
  }
  await sendNotification({
    orgId: params.orgId,
    userId: ownerId,
    type: "trial_ending",
    title: "Trial ending soon",
    body: `Your Route5 trial ends on ${params.trialEnd}.${daysNote} After the trial, Free-plan limits apply. Review your plan in Billing.`,
    metadata: { link: `${base}/workspace/billing`, trialEnd: params.trialEnd },
  });
}

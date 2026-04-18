import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { planFromStripePriceId } from "@/lib/billing/plans";
import {
  findOrgIdByStripeCustomerId,
  findOrgIdByStripeSubscriptionId,
  getOrgSubscription,
  insertOrgInvoiceIfNew,
  tryClaimStripeWebhookEvent,
  updateOrganizationPlan,
  upsertOrgSubscriptionPartial,
} from "@/lib/billing/store";
import type { SubscriptionStatus } from "@/lib/billing/types";
import {
  sendPaymentFailedEmail,
  sendPaymentSucceededEmail,
  sendSubscriptionCancelledEmail,
  sendTrialEndingEmail,
} from "@/lib/billing/emails";
import { getStripe } from "@/lib/billing/stripe-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "cancelled";
    case "trialing":
      return "trialing";
    case "unpaid":
      return "past_due";
    case "incomplete":
    case "incomplete_expired":
    default:
      return "incomplete";
  }
}

async function resolveOrgIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const metaOrg = sub.metadata?.org_id?.trim();
  if (metaOrg) return metaOrg;
  const bySub = await findOrgIdByStripeSubscriptionId(sub.id);
  if (bySub) return bySub;
  const cid = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (cid) return findOrgIdByStripeCustomerId(cid);
  return null;
}

async function resolveOrgIdFromInvoice(
  invoice: Stripe.Invoice,
  stripe: ReturnType<typeof getStripe>
): Promise<string | null> {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (subId) {
    const bySub = await findOrgIdByStripeSubscriptionId(subId);
    if (bySub) return bySub;
    const sub = await stripe.subscriptions.retrieve(subId);
    return resolveOrgIdFromSubscription(sub);
  }
  const cid = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (cid) {
    const byCust = await findOrgIdByStripeCustomerId(cid);
    if (byCust) return byCust;
    const cust = await stripe.customers.retrieve(cid);
    if (!cust.deleted && "metadata" in cust && cust.metadata?.org_id) {
      return cust.metadata.org_id;
    }
  }
  return null;
}

function ts(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  return new Date(sec * 1000).toISOString();
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const claimed = await tryClaimStripeWebhookEvent(event.id);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = await resolveOrgIdFromSubscription(sub);
        if (!orgId) break;
        const priceId = sub.items.data[0]?.price?.id;
        const planGuess = planFromStripePriceId(priceId);
        const existing = await getOrgSubscription(orgId);
        const plan = planGuess ?? existing?.plan ?? "free";
        const status = mapStripeSubscriptionStatus(sub.status);
        const seatCount = sub.items.data[0]?.quantity ?? 1;
        const paymentFailedAt =
          status === "past_due" ? new Date().toISOString() : null;
        await upsertOrgSubscriptionPartial({
          orgId,
          stripeCustomerId:
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          stripeSubscriptionId: sub.id,
          plan,
          status,
          currentPeriodStart: ts(sub.current_period_start),
          currentPeriodEnd: ts(sub.current_period_end),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          cancelledAt: sub.canceled_at ? ts(sub.canceled_at) : null,
          trialEnd: sub.trial_end ? ts(sub.trial_end) : null,
          seatCount,
          paymentFailedAt,
        });
        if (status === "active" || status === "trialing" || status === "past_due") {
          await updateOrganizationPlan(orgId, plan);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = await resolveOrgIdFromSubscription(sub);
        if (!orgId) break;
        await upsertOrgSubscriptionPartial({
          orgId,
          stripeSubscriptionId: sub.id,
          plan: "free",
          status: "cancelled",
          cancelAtPeriodEnd: false,
          cancelledAt: new Date().toISOString(),
          currentPeriodEnd: ts(sub.current_period_end),
        });
        await updateOrganizationPlan(orgId, "free");
        await sendSubscriptionCancelledEmail({
          orgId,
          accessEndDate: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toLocaleDateString()
            : null,
        });
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = await resolveOrgIdFromInvoice(invoice, stripe);
        if (!orgId) break;
        const amount = invoice.amount_paid ?? invoice.amount_due ?? 0;
        const inserted = await insertOrgInvoiceIfNew({
          orgId,
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId:
            typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent && typeof invoice.payment_intent === "object"
                ? invoice.payment_intent.id
                : null,
          amountCents: amount,
          currency: invoice.currency ?? "usd",
          status: "paid",
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdfUrl: invoice.invoice_pdf ?? null,
          periodStart: invoice.period_start ? ts(invoice.period_start) : null,
          periodEnd: invoice.period_end ? ts(invoice.period_end) : null,
        });
        if (inserted) {
          await upsertOrgSubscriptionPartial({
            orgId,
            paymentFailedAt: null,
          });
          const periodLabel =
            invoice.period_start && invoice.period_end
              ? `${new Date(invoice.period_start * 1000).toLocaleDateString()} – ${new Date(
                  invoice.period_end * 1000
                ).toLocaleDateString()}`
              : "Current period";
          await sendPaymentSucceededEmail({
            orgId,
            amountCents: amount,
            currency: invoice.currency ?? "usd",
            periodLabel,
            invoicePdfUrl: invoice.invoice_pdf ?? null,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = await resolveOrgIdFromInvoice(invoice, stripe);
        if (!orgId) break;
        const amount = invoice.amount_due ?? invoice.amount_remaining ?? 0;
        await insertOrgInvoiceIfNew({
          orgId,
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId:
            typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent && typeof invoice.payment_intent === "object"
                ? invoice.payment_intent.id
                : null,
          amountCents: amount,
          currency: invoice.currency ?? "usd",
          status: "open",
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdfUrl: invoice.invoice_pdf ?? null,
          periodStart: invoice.period_start ? ts(invoice.period_start) : null,
          periodEnd: invoice.period_end ? ts(invoice.period_end) : null,
        });
        await upsertOrgSubscriptionPartial({
          orgId,
          paymentFailedAt: new Date().toISOString(),
        });
        await sendPaymentFailedEmail({ orgId });
        break;
      }
      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = await resolveOrgIdFromSubscription(sub);
        if (!orgId || !sub.trial_end) break;
        await sendTrialEndingEmail({
          orgId,
          trialEnd: new Date(sub.trial_end * 1000).toLocaleString(),
        });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("billing webhook handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

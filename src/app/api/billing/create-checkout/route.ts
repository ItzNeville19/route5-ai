import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { CHECKOUT_PRICES } from "@/lib/billing/plans";
import { getStripe, appBaseUrl } from "@/lib/billing/stripe-client";
import { getOrgSubscription, upsertOrgSubscriptionPartial } from "@/lib/billing/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    plan: z.enum(["starter", "growth"]),
    billingPeriod: z.enum(["monthly", "annual"]),
  })
  .strict();

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const { plan, billingPeriod } = parsed.data;
    const priceId =
      billingPeriod === "monthly"
        ? CHECKOUT_PRICES[plan].monthly
        : CHECKOUT_PRICES[plan].annual;
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price IDs are not configured in environment" },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      undefined;

    const sub = await getOrgSubscription(orgId);
    let customerId = sub?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
      await upsertOrgSubscriptionPartial({
        orgId,
        stripeCustomerId: customerId,
        plan: "free",
        status: "incomplete",
      });
    }

    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/workspace/billing?checkout=success`,
      cancel_url: `${base}/workspace/billing`,
      metadata: { org_id: orgId },
      subscription_data: {
        metadata: { org_id: orgId },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout session missing URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("create-checkout", e);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}

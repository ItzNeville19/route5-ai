import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { getStripe, appBaseUrl } from "@/lib/billing/stripe-client";
import { getOrgSubscription } from "@/lib/billing/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const sub = await getOrgSubscription(orgId);
    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer for this workspace. Start a subscription from Billing first." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const base = appBaseUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${base}/workspace/billing`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Portal session missing URL" }, { status: 500 });
    }

    return NextResponse.redirect(session.url, 303);
  } catch (e) {
    console.error("billing portal", e);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}

import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getWebhookEndpoint, listWebhookDeliveriesForEndpoint } from "@/lib/public-api/webhooks-store";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const ep = await getWebhookEndpoint(orgId, id);
    if (!ep) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const deliveries = await listWebhookDeliveriesForEndpoint(orgId, id, limit);
    return NextResponse.json({ deliveries });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load deliveries" }, { status: 500 });
  }
}

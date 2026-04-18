import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getWebhookEndpoint, listWebhookDeliveriesForEndpoint } from "@/lib/public-api/webhooks-store";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

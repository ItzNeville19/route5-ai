import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { deliverWebhookTest } from "@/lib/public-api/webhooks";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const r = await deliverWebhookTest(orgId, id);
    return NextResponse.json({ ok: r.ok, status: r.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}

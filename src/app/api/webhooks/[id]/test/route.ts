import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { deliverWebhookTest } from "@/lib/public-api/webhooks";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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

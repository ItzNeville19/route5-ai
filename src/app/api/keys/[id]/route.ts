import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { revokeApiKey } from "@/lib/public-api/keys-store";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const { id } = await ctx.params;
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const ok = await revokeApiKey(orgId, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}

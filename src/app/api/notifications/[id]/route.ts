import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { softDeleteNotification } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const { id } = await ctx.params;
  try {
    const ok = await softDeleteNotification(id, userId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

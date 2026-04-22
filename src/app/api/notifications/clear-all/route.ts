import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { softDeleteAllNotifications } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function POST() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  try {
    const cleared = await softDeleteAllNotifications(userId);
    return NextResponse.json({ ok: true, cleared });
  } catch {
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
  }
}

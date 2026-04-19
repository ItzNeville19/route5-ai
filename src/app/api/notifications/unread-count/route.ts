import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { countUnreadNotifications } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  try {
    const count = await countUnreadNotifications(userId);
    return NextResponse.json({ count });
  } catch (e) {
    console.error("[api/notifications/unread-count]", e);
    return NextResponse.json({ count: 0 });
  }
}

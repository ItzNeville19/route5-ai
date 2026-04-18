import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listOrgNotificationsForUser } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);

  try {
    const notifications = await listOrgNotificationsForUser({
      userId,
      unreadOnly,
      limit,
      offset,
    });
    return NextResponse.json({ notifications });
  } catch (e) {
    console.error("[api/notifications] list failed", e);
    return NextResponse.json({ notifications: [] });
  }
}

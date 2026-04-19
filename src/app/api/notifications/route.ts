import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { listOrgNotificationsForUser } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
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

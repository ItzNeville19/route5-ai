import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { markAllNotificationsRead } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const updated = await markAllNotificationsRead(userId);
    return NextResponse.json({ ok: true, updated });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

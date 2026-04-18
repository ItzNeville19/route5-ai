import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { countUnreadNotifications } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const count = await countUnreadNotifications(userId);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

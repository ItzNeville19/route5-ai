import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { markChannelRead } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ channelId: string }> }
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const { channelId } = await context.params;
  if (!channelId) return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
  await markChannelRead(auth.userId, channelId);
  return NextResponse.json({ ok: true });
}

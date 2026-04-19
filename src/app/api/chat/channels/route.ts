import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { createDirectChannel, listChannelsForUser } from "@/lib/chat/store";
import { z } from "zod";

export const dynamic = "force-dynamic";

const directSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function GET() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const channels = await listChannelsForUser(auth.userId);
  return NextResponse.json({ channels });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const parsed = directSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
  }
  const channel = await createDirectChannel(auth.userId, parsed.data.targetUserId);
  if (!channel) {
    return NextResponse.json({ error: "Unable to create direct channel" }, { status: 400 });
  }
  return NextResponse.json({ channel });
}

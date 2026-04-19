import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { addMembersToGroupChannel } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(40),
});

export async function POST(req: Request, ctx: { params: Promise<{ channelId: string }> }) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const { channelId } = await ctx.params;
  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const result = await addMembersToGroupChannel(auth.userId, channelId, parsed.data.userIds);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not add members" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

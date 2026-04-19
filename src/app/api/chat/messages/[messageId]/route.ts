import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { broadcastChatChannel } from "@/lib/chat/broadcast";
import { deleteChatMessage, hideChatMessageForUser, updateChatMessage } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  body: z.string().min(1).max(4000),
});

const deleteSchema = z.object({
  scope: z.enum(["self", "all"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ messageId: string }> }) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const { messageId } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const updated = await updateChatMessage(auth.userId, messageId, parsed.data.body);
  if (!updated) {
    return NextResponse.json({ error: "Could not update message" }, { status: 400 });
  }
  broadcastChatChannel(updated.channelId, { id: messageId, action: "updated" });
  return NextResponse.json({ message: updated });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ messageId: string }> }) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const { messageId } = await ctx.params;
  const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const scope = parsed.data.scope ?? "all";
  if (scope === "self") {
    const channelId = await hideChatMessageForUser(auth.userId, messageId);
    if (!channelId) {
      return NextResponse.json({ error: "Could not hide message" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, scope: "self" as const });
  }
  const channelId = await deleteChatMessage(auth.userId, messageId);
  if (!channelId) {
    return NextResponse.json({ error: "Could not delete message" }, { status: 400 });
  }
  broadcastChatChannel(channelId, { id: messageId, action: "deleted" });
  return NextResponse.json({ ok: true, scope: "all" as const });
}

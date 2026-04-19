import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import {
  createChatMessage,
  listChannelMemberIds,
  listChannelsForUser,
  listMessagesForChannel,
  markChannelRead,
} from "@/lib/chat/store";
import { broadcastChatChannel, broadcastChatUnread } from "@/lib/chat/broadcast";
import { insertOrgNotification } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  channelId: z.string().min(1),
  body: z.string().max(4000).optional(),
  attachments: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        name: z.string().min(1).max(260),
        mimeType: z.string().max(180).optional(),
        size: z.number().int().nonnegative().max(50 * 1024 * 1024).optional(),
      })
    )
    .max(8)
    .optional(),
});

export async function GET(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
  const channels = await listChannelsForUser(auth.userId);
  const channel = channels.find((item) => item.id === channelId);
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  const messages = await listMessagesForChannel(auth.userId, channelId);
  await markChannelRead(auth.userId, channelId);
  return NextResponse.json({ channel, messages });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const normalizedBody = (parsed.data.body ?? "").trim();
  if (!normalizedBody && (parsed.data.attachments?.length ?? 0) === 0) {
    return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
  }
  const message = await createChatMessage(
    auth.userId,
    parsed.data.channelId,
    normalizedBody || "[attachment]",
    parsed.data.attachments ?? []
  );
  if (!message) return NextResponse.json({ error: "Message could not be created" }, { status: 400 });
  broadcastChatChannel(parsed.data.channelId, {
    id: message.id,
    channelId: parsed.data.channelId,
    userId: auth.userId,
    createdAt: message.createdAt,
  });
  const memberIds = await listChannelMemberIds(parsed.data.channelId);
  for (const memberId of memberIds) {
    if (memberId === auth.userId) continue;
    broadcastChatUnread(memberId, {
      channelId: parsed.data.channelId,
      messageId: message.id,
      createdAt: message.createdAt,
    });
    await insertOrgNotification({
      orgId: message.orgId,
      userId: memberId,
      type: "chat_message",
      title: "New team message",
      body: (normalizedBody || "Sent an attachment").slice(0, 160),
      metadata: { channelId: parsed.data.channelId, messageId: message.id, link: "/workspace/chat" },
    });
  }
  return NextResponse.json({ message });
}

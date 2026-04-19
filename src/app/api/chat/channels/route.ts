import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { createDirectChannel, createGroupChannel, listChannelsForUser } from "@/lib/chat/store";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z
  .object({
    type: z.enum(["direct", "group"]).default("direct"),
    targetUserId: z.string().min(1).optional(),
    title: z.string().min(1).max(200).optional(),
    memberUserIds: z.array(z.string().min(1)).max(40).optional(),
  })
  .strict();

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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid channel payload" }, { status: 400 });
  }
  let channel = null;
  if (parsed.data.type === "group") {
    channel = await createGroupChannel(
      auth.userId,
      parsed.data.title ?? "",
      parsed.data.memberUserIds ?? []
    );
  } else {
    channel = await createDirectChannel(auth.userId, parsed.data.targetUserId ?? "");
  }
  if (!channel) {
    return NextResponse.json({ error: "Unable to create channel" }, { status: 400 });
  }
  return NextResponse.json({ channel });
}

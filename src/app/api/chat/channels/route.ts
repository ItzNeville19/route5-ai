import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { createDirectChannel, createGroupChannel, listChannelsForUser } from "@/lib/chat/store";
import { isSupabaseConfigured } from "@/lib/supabase-env";
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
    let msg = "Unable to create channel.";
    if (!isSupabaseConfigured() && parsed.data.type === "group") {
      msg =
        "Group channels need Supabase. On Vercel, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role), apply migrations from supabase/migrations, then redeploy.";
    } else if (parsed.data.type === "direct") {
      msg =
        "Could not start a DM. Pick someone in your organization, or check that Supabase is configured on the server.";
    } else if (parsed.data.type === "group") {
      msg =
        "Group needs you plus at least one teammate — select members from your organization (invite people under Organization if the list is empty).";
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ channel });
}

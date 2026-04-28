import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole, listOrganizationMembers } from "@/lib/workspace/org-members";
import { sendNotification } from "@/lib/notifications/service";
import { appBaseUrl } from "@/lib/app-base-url";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    body: z.string().trim().min(1).max(4000),
    recipientUserIds: z.array(z.string().min(1).max(128)).min(1).max(40),
    linkPath: z.string().trim().max(512).optional(),
  })
  .strict();

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Only admins or managers can send update requests." }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const orgId = access.orgId;
  const members = await listOrganizationMembers(orgId);
  const allowed = new Set(members.filter((m) => m.status !== "removed").map((m) => m.userId));

  const recipients = [...new Set(parsed.data.recipientUserIds)].filter((id) => allowed.has(id));
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No valid recipients in this workspace." }, { status: 400 });
  }

  const base = appBaseUrl();
  const link =
    parsed.data.linkPath && parsed.data.linkPath.startsWith("/")
      ? `${base.replace(/\/$/, "")}${parsed.data.linkPath}`
      : `${base}/workspace/dashboard`;

  let sent = 0;
  let failed = 0;
  await Promise.allSettled(
    recipients.map(async (recipientId) => {
      try {
        await sendNotification({
          orgId,
          userId: recipientId,
          type: "chat_message",
          title: parsed.data.title,
          body: parsed.data.body,
          metadata: {
            link,
            fromLeadership: true,
            senderUserId: userId,
          },
          forceChannels: { inApp: true, email: true, slack: true },
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    })
  );

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}

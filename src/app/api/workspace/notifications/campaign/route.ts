import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole, listOrganizationMembers } from "@/lib/workspace/org-members";
import { sendNotification } from "@/lib/notifications/service";

export const runtime = "nodejs";

const CampaignType = z.enum(["marketing_product_updates", "marketing_feature_tips"]);

const BodySchema = z.object({
  type: CampaignType,
  title: z.string().trim().min(6).max(160),
  body: z.string().trim().min(20).max(2000),
  ctaLabel: z.string().trim().min(2).max(80).optional(),
  ctaUrl: z.string().trim().url().max(800).optional(),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  slack: z.boolean().optional(),
});

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const access = await requireOrgRole(userId, ["admin"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Only org admins can send campaigns." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign payload." }, { status: 400 });
  }

  try {
    const orgId = access.orgId;
    const members = await listOrganizationMembers(orgId);
    const recipientIds = members
      .filter((row) => row.status !== "removed")
      .map((row) => row.userId);
    if (recipientIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0 });
    }

    let sent = 0;
    let failed = 0;
    await Promise.allSettled(
      recipientIds.map(async (recipientId) => {
        try {
          await sendNotification({
            orgId,
            userId: recipientId,
            type: parsed.data.type,
            title: parsed.data.title,
            body: parsed.data.body,
            metadata: {
              ctaLabel: parsed.data.ctaLabel,
              ctaUrl: parsed.data.ctaUrl,
              link: parsed.data.ctaUrl,
            },
            forceChannels: {
              inApp: parsed.data.inApp,
              email: parsed.data.email,
              slack: parsed.data.slack,
            },
          });
          sent += 1;
        } catch {
          failed += 1;
        }
      })
    );

    return NextResponse.json({ ok: true, sent, failed, total: recipientIds.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

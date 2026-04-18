import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications/types";
import {
  defaultPreferencesForOrg,
  listPreferencesForUser,
  upsertNotificationPreference,
} from "@/lib/notifications/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";

export const runtime = "nodejs";

function mergeDefaults(
  orgId: string,
  userId: string,
  rows: Awaited<ReturnType<typeof listPreferencesForUser>>
) {
  const defaults = defaultPreferencesForOrg(orgId, userId);
  const byType = new Map(rows.map((r) => [r.type, r]));
  return defaults.map((d) => {
    const existing = byType.get(d.type);
    if (!existing) return d;
    return {
      ...existing,
      inApp: existing.inApp,
      email: existing.email,
      slack: existing.slack,
    };
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const rows = await listPreferencesForUser(orgId, userId);
    const preferences = mergeDefaults(orgId, userId, rows);
    const slack = await getSlackIntegrationForOrg(orgId);
    const slackConnected = slack != null && slack.status === "connected";
    return NextResponse.json({ orgId, preferences, slackConnected });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

const prefItem = z.object({
  type: z.enum(NOTIFICATION_TYPES as unknown as [NotificationType, ...NotificationType[]]),
  inApp: z.boolean(),
  email: z.boolean(),
  slack: z.boolean(),
});

const putSchema = z.object({
  updates: z.array(prefItem).min(1),
});

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    for (const u of parsed.data.updates) {
      await upsertNotificationPreference({
        orgId,
        userId,
        type: u.type,
        inApp: u.inApp,
        email: u.email,
        slack: u.slack,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

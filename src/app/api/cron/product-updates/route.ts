import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { listAllOrganizationIds } from "@/lib/dashboard/store";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { sendNotification } from "@/lib/notifications/service";
import { appBaseUrl } from "@/lib/app-base-url";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  try {
    const orgIds = await listAllOrganizationIds();
    for (const orgId of orgIds) {
      const ownerUserId = await getOrganizationClerkUserId(orgId);
      if (!ownerUserId) {
        skipped += 1;
        continue;
      }
      try {
        await sendNotification({
          orgId,
          userId: ownerUserId,
          type: "marketing_product_updates",
          title: "New Route5 updates are live",
          body: "Execution surface improvements and workflow fixes are available in your workspace.",
          metadata: {
            link: `${appBaseUrl()}/desk`,
            ctaUrl: `${appBaseUrl()}/workspace/help`,
            ctaLabel: "See what changed",
          },
          forceChannels: { inApp: true, email: true, slack: false },
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    return NextResponse.json({ ok: true, sent, skipped, failed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send updates" },
      { status: 500 }
    );
  }
}

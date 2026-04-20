import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { listWebhookDeliveriesDueRetry } from "@/lib/public-api/webhooks-store";
import { processWebhookDeliveryRetry } from "@/lib/public-api/webhooks";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const now = new Date().toISOString();
  let processed = 0;
  try {
    const due = await listWebhookDeliveriesDueRetry(now, 50);
    for (const d of due) {
      await processWebhookDeliveryRetry(d.id);
      processed++;
    }
    return NextResponse.json({ ok: true, processed });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

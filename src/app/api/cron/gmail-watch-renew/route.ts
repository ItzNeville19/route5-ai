import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { renewAllGmailPushWatches } from "@/lib/integrations/gmail-renew-watch";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  try {
    const r = await renewAllGmailPushWatches();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

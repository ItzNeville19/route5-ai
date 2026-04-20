import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { listConnectedSlackIntegrations } from "@/lib/integrations/org-integrations-store";
import { postSlackDailyDigestForOrg } from "@/lib/integrations/slack-digest";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  try {
    const rows = await listConnectedSlackIntegrations();
    let sent = 0;
    for (const r of rows) {
      if (r.metadata.digest_channel_id?.trim()) {
        const ok = await postSlackDailyDigestForOrg(r.orgId);
        if (ok) sent++;
      }
    }
    return NextResponse.json({ ok: true, orgs: rows.length, digestsSent: sent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

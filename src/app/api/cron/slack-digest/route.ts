import { NextResponse } from "next/server";
import { listConnectedSlackIntegrations } from "@/lib/integrations/org-integrations-store";
import { postSlackDailyDigestForOrg } from "@/lib/integrations/slack-digest";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
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

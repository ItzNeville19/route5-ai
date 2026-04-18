import { NextResponse } from "next/server";
import { listAllOrganizationIds, fetchOrganizationName } from "@/lib/dashboard/store";
import { collectWeeklySummaryRecipients } from "@/lib/escalations/notify";
import { generateWeeklyExecutiveSummaryHtml } from "@/lib/org-commitments/weekly-executive-summary";
import { sendNotificationToEmail } from "@/lib/notifications/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const orgIds = await listAllOrganizationIds();
    for (const orgId of orgIds) {
      const recipients = await collectWeeklySummaryRecipients(orgId);
      if (recipients.length === 0) {
        skipped++;
        continue;
      }
      const html = await generateWeeklyExecutiveSummaryHtml(orgId);
      if (!html) {
        failed++;
        continue;
      }
      const orgName = await fetchOrganizationName(orgId);
      const subject = `Weekly executive summary — ${orgName}`;
      const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      for (const to of recipients) {
        try {
          await sendNotificationToEmail({
            orgId,
            email: to,
            type: "weekly_summary",
            title: subject,
            body: text,
            htmlOverride: html,
          });
          sent++;
        } catch {
          failed++;
        }
      }
    }
    return NextResponse.json({ ok: true, orgs: orgIds.length, emailsSent: sent, skipped, failed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { gmailUsersWatch } from "@/lib/integrations/gmail-google";
import { getValidGmailAccessToken } from "@/lib/integrations/gmail-token";
import { listConnectedGmailIntegrations, upsertGmailWatchRow } from "@/lib/integrations/org-integrations-store";

export async function renewAllGmailPushWatches(): Promise<{ renewed: number; skipped: number; failed: number }> {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC?.trim();
  const rows = await listConnectedGmailIntegrations();
  if (!topic) {
    return { renewed: 0, skipped: rows.length, failed: 0 };
  }
  let renewed = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const token = await getValidGmailAccessToken(r);
      if (!token) {
        failed++;
        continue;
      }
      const w = await gmailUsersWatch(token, topic);
      await upsertGmailWatchRow({
        orgId: r.orgId,
        historyId: w.historyId,
        expirationIso: w.expiration,
      });
      renewed++;
    } catch {
      failed++;
    }
  }
  return { renewed, skipped: 0, failed };
}

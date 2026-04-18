import { gmailUsersWatch } from "@/lib/integrations/gmail-google";
import { getValidGmailAccessToken } from "@/lib/integrations/gmail-token";
import { listConnectedGmailIntegrations, upsertGmailWatchRow } from "@/lib/integrations/org-integrations-store";
import { renewMeetWorkspaceSubscriptionIfNeeded } from "@/lib/integrations/gmeet-workspace-subscription";

export async function renewAllGmailPushWatches(): Promise<{ renewed: number; skipped: number; failed: number }> {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC?.trim();
  const rows = await listConnectedGmailIntegrations();
  let renewed = 0;
  let failed = 0;

  for (const r of rows) {
    try {
      const token = await getValidGmailAccessToken(r);
      if (!token) {
        failed++;
        continue;
      }

      if (topic) {
        const w = await gmailUsersWatch(token, topic);
        await upsertGmailWatchRow({
          orgId: r.orgId,
          historyId: w.historyId,
          expirationIso: w.expiration,
        });
        renewed++;
      }

      try {
        await renewMeetWorkspaceSubscriptionIfNeeded(r.orgId, token, r.metadata ?? {});
      } catch {
        /* Meet subscription optional */
      }
    } catch {
      failed++;
    }
  }

  const skipped = topic ? 0 : rows.length;
  return { renewed, skipped, failed };
}

import { computeLiveDashboardMetrics } from "@/lib/dashboard/compute";
import { fetchMetricRowsForOrg } from "@/lib/dashboard/store";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import { slackApi } from "@/lib/integrations/slack-api";
import { getSlackBotAccessToken } from "@/lib/integrations/slack-token";
import { getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { fetchCommitmentsByIds, listEscalationsForApi } from "@/lib/escalations/store";

export async function postSlackDailyDigestForOrg(orgId: string): Promise<boolean> {
  const integ = await getSlackIntegrationForOrg(orgId);
  if (!integ) return false;
  const channel = integ.metadata.digest_channel_id?.trim();
  if (!channel) return false;
  const token = getSlackBotAccessToken(integ);
  if (!token) return false;

  const rows = await fetchMetricRowsForOrg(orgId);
  const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
  const names = await resolveOwnerDisplayNames(ownerIds);
  const metrics = computeLiveDashboardMetrics(rows, names);
  const esc = await listEscalationsForApi({ orgId, resolved: "open", snoozed: "no", limit: 3 });
  const cids = esc.map((e) => e.commitmentId).filter(Boolean) as string[];
  const comm = await fetchCommitmentsByIds(orgId, cids);
  const titles = new Map(comm.map((c) => [c.id, c.title]));

  const top = esc
    .slice(0, 3)
    .map((e) => `• ${e.severity}: ${titles.get(e.commitmentId) ?? e.commitmentId}`)
    .join("\n");

  const text = [
    "*Route5 daily digest*",
    `Health score: ${metrics.healthScore}`,
    `Active: ${metrics.activeCount} · At risk: ${metrics.atRiskCount} · Overdue: ${metrics.overdueCount}`,
    `Top escalations:\n${top || "—"}`.trim(),
  ].join("\n");

  const j = await slackApi(token, "chat.postMessage", { channel, text });
  return Boolean(j.ok);
}

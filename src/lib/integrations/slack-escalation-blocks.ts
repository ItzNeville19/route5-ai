import { slackApi } from "@/lib/integrations/slack-api";
import { getSlackBotAccessToken } from "@/lib/integrations/slack-token";
import { getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import type { OrgEscalationSeverity } from "@/lib/escalations/types";
import { appBaseUrl } from "@/lib/app-base-url";

function severityEmoji(s: OrgEscalationSeverity): string {
  switch (s) {
    case "warning":
      return "⚠️";
    case "urgent":
      return "🟠";
    case "critical":
      return "🔴";
    case "overdue":
      return "⛔";
    default:
      return "•";
  }
}

export async function postSlackEscalationBlockKit(params: {
  orgId: string;
  escalationId: string;
  commitmentId: string;
  title: string;
  deadline: string;
  severity: OrgEscalationSeverity;
  ownerMention?: string | null;
}): Promise<boolean> {
  const integ = await getSlackIntegrationForOrg(params.orgId);
  if (!integ) return false;
  const channel = integ.metadata.escalation_channel_id?.trim();
  if (!channel) return false;
  const token = getSlackBotAccessToken(integ);
  if (!token) return false;

  const link = `${appBaseUrl()}/workspace/commitments?id=${encodeURIComponent(params.commitmentId)}`;
  const value = JSON.stringify({
    escalationId: params.escalationId,
    orgId: params.orgId,
    commitmentId: params.commitmentId,
  });

  const body = {
    channel,
    text: `${severityEmoji(params.severity)} Escalation: ${params.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `${severityEmoji(params.severity)} *${params.severity.toUpperCase()}* — ${params.title}`,
            params.ownerMention ? `Owner: ${params.ownerMention}` : "",
            `Deadline: ${params.deadline}`,
            `<${link}|Open in Route5>`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Snooze 24h" },
            action_id: "route5_escalation_snooze",
            value,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Resolve…" },
            action_id: "route5_escalation_resolve_open",
            value,
          },
        ],
      },
    ],
  };

  const j = await slackApi(token, "chat.postMessage", body);
  return Boolean(j.ok);
}

import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { createOrgCommitmentAsOrgOwner } from "@/lib/org-commitments/repository";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { detectDecisionInSlackMessage } from "@/lib/integrations/slack-decision-ai";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { insertTeamsCapturedMessage } from "@/lib/integrations/meeting-stores";
import type { OrgIntegrationRow } from "@/lib/integrations/types";

function defaultDeadline(): string {
  return new Date(Date.now() + 7 * 24 * 3600000).toISOString();
}

function parseDeadline(iso: string | null | undefined): string {
  if (iso) {
    const t = new Date(iso).getTime();
    if (Number.isFinite(t) && t > Date.now()) return new Date(t).toISOString();
  }
  return defaultDeadline();
}

function clampPriority(p: string | null | undefined): OrgCommitmentPriority {
  if (p === "critical" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

export async function processTeamsChannelMessage(params: {
  integration: OrgIntegrationRow;
  teamId: string;
  channelId: string;
  messageId: string;
  text: string;
  fromUserId: string | null;
  fromName: string | null;
  receivedAt: string;
}): Promise<void> {
  const meta = params.integration.metadata;
  const monitored = meta.teams_monitored_channel_ids;
  if (monitored && monitored.length > 0 && !monitored.includes(params.channelId)) {
    return;
  }

  const text = params.text.trim();
  if (text.toLowerCase().startsWith("/route5")) {
    await handleTeamsSlashRoute5(params);
    return;
  }

  let decision;
  try {
    decision = await detectDecisionInSlackMessage(text);
  } catch {
    try {
      await insertTeamsCapturedMessage({
        orgId: params.integration.orgId,
        teamsMessageId: params.messageId,
        teamsChannelId: params.channelId,
        teamsTeamId: params.teamId,
        fromUserId: params.fromUserId,
        fromDisplayName: params.fromName,
        content: text,
        receivedAt: params.receivedAt,
        processed: true,
        decisionDetected: false,
        commitmentId: null,
        confidenceScore: null,
      });
    } catch {
      /* duplicate */
    }
    return;
  }

  const conf = decision.confidence_score ?? 0;
  if (!decision.is_decision || conf < 0.5) {
    try {
      await insertTeamsCapturedMessage({
        orgId: params.integration.orgId,
        teamsMessageId: params.messageId,
        teamsChannelId: params.channelId,
        teamsTeamId: params.teamId,
        fromUserId: params.fromUserId,
        fromDisplayName: params.fromName,
        content: text,
        receivedAt: params.receivedAt,
        processed: true,
        decisionDetected: false,
        commitmentId: null,
        confidenceScore: conf,
      });
    } catch {
      /* duplicate */
    }
    return;
  }

  const title = (decision.decision_text || text).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);
  const ownerId = await getOrganizationClerkUserId(params.integration.orgId);
  if (!ownerId) return;

  if (conf > 0.75) {
    const row = await createOrgCommitmentAsOrgOwner(params.integration.orgId, {
      title,
      description: `From Teams (confidence ${conf.toFixed(2)})`,
      ownerId,
      deadline,
      priority,
    });
    try {
      await insertTeamsCapturedMessage({
        orgId: params.integration.orgId,
        teamsMessageId: params.messageId,
        teamsChannelId: params.channelId,
        teamsTeamId: params.teamId,
        fromUserId: params.fromUserId,
        fromDisplayName: params.fromName,
        content: text,
        receivedAt: params.receivedAt,
        processed: true,
        decisionDetected: true,
        commitmentId: row.id,
        confidenceScore: conf,
      });
    } catch {
      /* duplicate */
    }
    void broadcastOrgCommitmentEvent(params.integration.orgId, { kind: "commitment_created", id: row.id });
    return;
  }

  try {
    await insertTeamsCapturedMessage({
      orgId: params.integration.orgId,
      teamsMessageId: params.messageId,
      teamsChannelId: params.channelId,
      teamsTeamId: params.teamId,
      fromUserId: params.fromUserId,
      fromDisplayName: params.fromName,
      content: text,
      receivedAt: params.receivedAt,
      processed: false,
      decisionDetected: true,
      commitmentId: null,
      confidenceScore: conf,
    });
  } catch {
    /* duplicate */
  }
}

async function handleTeamsSlashRoute5(params: {
  integration: OrgIntegrationRow;
  teamId: string;
  channelId: string;
  messageId: string;
  text: string;
  fromUserId: string | null;
  fromName: string | null;
  receivedAt: string;
}): Promise<void> {
  const parts = params.text.trim().split(/\s+/);
  const sub = parts[1]?.toLowerCase();
  const ownerId = await getOrganizationClerkUserId(params.integration.orgId);
  if (!ownerId) return;

  if (sub === "create") {
    const title = parts.slice(2).join(" ").trim() || "Teams commitment";
    const row = await createOrgCommitmentAsOrgOwner(params.integration.orgId, {
      title: title.slice(0, 500),
      description: "Created from /route5 create",
      ownerId,
      deadline: defaultDeadline(),
      priority: "medium",
    });
    try {
      await insertTeamsCapturedMessage({
        orgId: params.integration.orgId,
        teamsMessageId: params.messageId,
        teamsChannelId: params.channelId,
        teamsTeamId: params.teamId,
        fromUserId: params.fromUserId,
        fromDisplayName: params.fromName,
        content: params.text,
        receivedAt: params.receivedAt,
        processed: true,
        decisionDetected: true,
        commitmentId: row.id,
        confidenceScore: 1,
      });
    } catch {
      /* dup */
    }
    void broadcastOrgCommitmentEvent(params.integration.orgId, { kind: "commitment_created", id: row.id });
    return;
  }

  if (sub === "status") {
    /* Stats would require dashboard metrics fetch — store message only */
    try {
      await insertTeamsCapturedMessage({
        orgId: params.integration.orgId,
        teamsMessageId: params.messageId,
        teamsChannelId: params.channelId,
        teamsTeamId: params.teamId,
        fromUserId: params.fromUserId,
        fromDisplayName: params.fromName,
        content: params.text,
        receivedAt: params.receivedAt,
        processed: true,
        decisionDetected: false,
        commitmentId: null,
        confidenceScore: null,
      });
    } catch {
      /* dup */
    }
  }
}

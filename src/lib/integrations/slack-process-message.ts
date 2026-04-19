import { clerkClient } from "@clerk/nextjs/server";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { createOrgCommitmentAsOrgOwner } from "@/lib/org-commitments/repository";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { detectDecisionInSlackMessage } from "@/lib/integrations/slack-decision-ai";
import { slackApi } from "@/lib/integrations/slack-api";
import { getSlackBotAccessToken } from "@/lib/integrations/slack-token";
import {
  getSlackCapturedById,
  getSlackIntegrationByTeamId,
  getSlackIntegrationForOrg,
  insertSlackCapturedMessage,
  touchSlackIntegrationUsed,
  updateSlackCapturedMessage,
} from "@/lib/integrations/org-integrations-store";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";

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

async function resolveOwnerClerkId(
  orgId: string,
  inferred: string | null | undefined,
  emailHint: string | null
): Promise<string> {
  const fallback = await getOrganizationClerkUserId(orgId);
  if (!fallback) throw new Error("No org owner");
  const tryEmail = emailHint?.trim();
  if (tryEmail?.includes("@")) {
    try {
      const client = await clerkClient();
      const res = await client.users.getUserList({ emailAddress: [tryEmail] });
      const u = res.data?.[0];
      if (u?.id) return u.id;
    } catch {
      /* use fallback */
    }
  }
  return fallback;
}

async function slackUserEmail(token: string, slackUser: string): Promise<string | null> {
  const j = await slackApi(token, "users.info", { user: slackUser });
  if (!j.ok) return null;
  const u = j.user as { profile?: { email?: string } } | undefined;
  return u?.profile?.email?.trim() ?? null;
}

export async function processSlackMessageEvent(payload: {
  teamId: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  botId?: string;
}): Promise<void> {
  const integration = await getSlackIntegrationByTeamId(payload.teamId);
  if (!integration) return;
  const token = getSlackBotAccessToken(integration);
  if (!token) return;

  await touchSlackIntegrationUsed(integration.orgId);

  if (payload.botId && payload.user === payload.botId) return;

  const meta = integration.metadata;
  const monitored = meta.monitored_channel_ids;
  if (monitored && monitored.length > 0 && !monitored.includes(payload.channel)) {
    return;
  }

  const email = await slackUserEmail(token, payload.user);

  let decision;
  try {
    decision = await detectDecisionInSlackMessage(payload.text);
  } catch {
    try {
      await insertSlackCapturedMessage({
        orgId: integration.orgId,
        slackTeamId: payload.teamId,
        slackChannelId: payload.channel,
        slackMessageTs: payload.ts,
        slackUserId: payload.user,
        content: payload.text,
        processed: true,
        decisionDetected: false,
        commitmentId: null,
        confidenceScore: null,
        decisionText: null,
      });
    } catch {
      /* duplicate message ts */
    }
    return;
  }

  const conf = decision.confidence_score ?? 0;

  if (!decision.is_decision || conf < 0.5) {
    try {
      await insertSlackCapturedMessage({
        orgId: integration.orgId,
        slackTeamId: payload.teamId,
        slackChannelId: payload.channel,
        slackMessageTs: payload.ts,
        slackUserId: payload.user,
        content: payload.text,
        processed: true,
        decisionDetected: false,
        commitmentId: null,
        confidenceScore: conf,
        decisionText: decision.decision_text ?? null,
      });
    } catch {
      /* duplicate */
    }
    return;
  }

  const title = (decision.decision_text || payload.text).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);

  if (conf > 0.75) {
    let row;
    try {
      const ownerId = await resolveOwnerClerkId(
        integration.orgId,
        decision.inferred_owner,
        email
      );
      row = await createOrgCommitmentAsOrgOwner(integration.orgId, {
        title,
        description: `From Slack (confidence ${conf.toFixed(2)})`,
        ownerId,
        deadline,
        priority,
      });
    } catch {
      return;
    }
    try {
      await insertSlackCapturedMessage({
        orgId: integration.orgId,
        slackTeamId: payload.teamId,
        slackChannelId: payload.channel,
        slackMessageTs: payload.ts,
        slackUserId: payload.user,
        content: payload.text,
        processed: true,
        decisionDetected: true,
        commitmentId: row.id,
        confidenceScore: conf,
        decisionText: decision.decision_text ?? null,
      });
      void broadcastOrgCommitmentEvent(integration.orgId, { kind: "commitment_created", id: row.id });
      const base =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
        "https://route5.ai";
      await slackApi(token, "chat.postMessage", {
        channel: payload.channel,
        thread_ts: payload.ts,
        text: `Route5 created commitment <${base}/workspace/commitments?id=${encodeURIComponent(row.id)}|${title.slice(0, 80)}>`,
      });
    } catch {
      /* duplicate capture row — commitment still created */
    }
    return;
  }

  /* 0.5 - 0.75 review queue */
  try {
    await insertSlackCapturedMessage({
      orgId: integration.orgId,
      slackTeamId: payload.teamId,
      slackChannelId: payload.channel,
      slackMessageTs: payload.ts,
      slackUserId: payload.user,
      content: payload.text,
      processed: false,
      decisionDetected: true,
      commitmentId: null,
      confidenceScore: conf,
      decisionText: decision.decision_text ?? null,
    });
  } catch {
    /* duplicate */
  }
}

export async function approveSlackReviewMessage(
  orgId: string,
  capturedId: string
): Promise<{ commitmentId: string } | null> {
  const cap = await getSlackCapturedById(capturedId, orgId);
  if (!cap || cap.processed || !cap.decisionDetected || cap.commitmentId) return null;

  const decision = await detectDecisionInSlackMessage(cap.content);
  const title = (decision.decision_text || cap.content).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);
  const integ = await getSlackIntegrationForOrg(orgId);
  const token = integ ? getSlackBotAccessToken(integ) : null;
  const email = cap.slackUserId && token ? await slackUserEmail(token, cap.slackUserId) : null;
  const ownerId = await resolveOwnerClerkId(orgId, decision.inferred_owner, email);

  const row = await createOrgCommitmentAsOrgOwner(orgId, {
    title,
    description: `Approved from Slack review`,
    ownerId,
    deadline,
    priority,
  });
  await updateSlackCapturedMessage(capturedId, {
    processed: true,
    decisionDetected: true,
    commitmentId: row.id,
  });
  broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
  return { commitmentId: row.id };
}

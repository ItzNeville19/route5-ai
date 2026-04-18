import { clerkClient } from "@clerk/nextjs/server";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { createOrgCommitmentAsOrgOwner } from "@/lib/org-commitments/repository";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { detectDecisionInText } from "@/lib/integrations/slack-decision-ai";
import {
  getGmailCapturedById,
  insertGmailCapturedEmail,
  updateGmailCapturedEmail,
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
  if (inferred?.trim()) {
    /* name fragment — still use fallback */
  }
  return fallback;
}

function emailTextForAi(subject: string, body: string): string {
  return [`Subject: ${subject}`, "", body].join("\n");
}

export async function processGmailInboundEmail(params: {
  orgId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string;
  receivedAt: string;
}): Promise<void> {
  const text = emailTextForAi(params.subject, params.bodyText);

  let decision;
  try {
    decision = await detectDecisionInText(text);
  } catch {
    try {
      await insertGmailCapturedEmail({
        orgId: params.orgId,
        gmailMessageId: params.gmailMessageId,
        gmailThreadId: params.gmailThreadId,
        fromEmail: params.fromEmail,
        fromName: params.fromName,
        subject: params.subject,
        bodyText: params.bodyText,
        receivedAt: params.receivedAt,
        processed: true,
        decisionDetected: false,
        commitmentId: null,
        confidenceScore: null,
        decisionText: null,
      });
    } catch {
      /* duplicate gmail_message_id */
    }
    return;
  }

  const conf = decision.confidence_score ?? 0;

  if (!decision.is_decision || conf < 0.5) {
    try {
      await insertGmailCapturedEmail({
        orgId: params.orgId,
        gmailMessageId: params.gmailMessageId,
        gmailThreadId: params.gmailThreadId,
        fromEmail: params.fromEmail,
        fromName: params.fromName,
        subject: params.subject,
        bodyText: params.bodyText,
        receivedAt: params.receivedAt,
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

  const title = (decision.decision_text || params.subject || params.bodyText).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);

  if (conf > 0.75) {
    let row;
    try {
      const ownerId = await resolveOwnerClerkId(params.orgId, decision.inferred_owner, params.fromEmail);
      row = await createOrgCommitmentAsOrgOwner(params.orgId, {
        title,
        description: `From Gmail (confidence ${conf.toFixed(2)})`,
        ownerId,
        deadline,
        priority,
      });
    } catch {
      return;
    }
    try {
      await insertGmailCapturedEmail({
        orgId: params.orgId,
        gmailMessageId: params.gmailMessageId,
        gmailThreadId: params.gmailThreadId,
        fromEmail: params.fromEmail,
        fromName: params.fromName,
        subject: params.subject,
        bodyText: params.bodyText,
        receivedAt: params.receivedAt,
        processed: true,
        decisionDetected: true,
        commitmentId: row.id,
        confidenceScore: conf,
        decisionText: decision.decision_text ?? null,
      });
      void broadcastOrgCommitmentEvent(params.orgId, { kind: "commitment_created", id: row.id });
    } catch {
      /* duplicate row */
    }
    return;
  }

  try {
    await insertGmailCapturedEmail({
      orgId: params.orgId,
      gmailMessageId: params.gmailMessageId,
      gmailThreadId: params.gmailThreadId,
      fromEmail: params.fromEmail,
      fromName: params.fromName,
      subject: params.subject,
      bodyText: params.bodyText,
      receivedAt: params.receivedAt,
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

export async function approveGmailReviewEmail(
  orgId: string,
  capturedId: string
): Promise<{ commitmentId: string } | null> {
  const cap = await getGmailCapturedById(capturedId, orgId);
  if (!cap || cap.processed || !cap.decisionDetected || cap.commitmentId) return null;

  const text = emailTextForAi(cap.subject, cap.bodyText);
  const decision = await detectDecisionInText(text);
  const title = (decision.decision_text || cap.subject).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);
  const ownerId = await resolveOwnerClerkId(orgId, decision.inferred_owner, cap.fromEmail);

  const row = await createOrgCommitmentAsOrgOwner(orgId, {
    title,
    description: `Approved from Gmail review`,
    ownerId,
    deadline,
    priority,
  });
  await updateGmailCapturedEmail(capturedId, {
    processed: true,
    decisionDetected: true,
    commitmentId: row.id,
  });
  broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
  return { commitmentId: row.id };
}

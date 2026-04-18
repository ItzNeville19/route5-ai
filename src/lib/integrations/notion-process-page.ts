import { clerkClient } from "@clerk/nextjs/server";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { createOrgCommitmentAsOrgOwner } from "@/lib/org-commitments/repository";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { detectDecisionInNotionContent } from "@/lib/integrations/slack-decision-ai";
import {
  getNotionCapturedById,
  upsertNotionCapturedPage,
  updateNotionCapturedPage,
} from "@/lib/integrations/notion-store";
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
  fallbackEmail: string | null
): Promise<string> {
  const fallback = await getOrganizationClerkUserId(orgId);
  if (!fallback) throw new Error("No org owner");
  const tryEmail = fallbackEmail?.trim();
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
  if (inferred?.includes("@")) {
    try {
      const client = await clerkClient();
      const res = await client.users.getUserList({ emailAddress: [inferred.trim()] });
      const u = res.data?.[0];
      if (u?.id) return u.id;
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

function pageTextForAi(title: string, body: string): string {
  return [`Title: ${title}`, "", body].join("\n");
}

export async function processNotionCapturedContent(params: {
  orgId: string;
  notionPageId: string;
  notionDatabaseId: string;
  title: string;
  contentText: string;
  pageUrl: string | null;
  createdTime: string | null;
  lastEditedTime: string | null;
}): Promise<void> {
  const text = pageTextForAi(params.title, params.contentText);

  let decision;
  try {
    decision = await detectDecisionInNotionContent(text);
  } catch {
    await upsertNotionCapturedPage({
      orgId: params.orgId,
      notionPageId: params.notionPageId,
      notionDatabaseId: params.notionDatabaseId,
      title: params.title,
      contentText: params.contentText,
      pageUrl: params.pageUrl,
      createdTime: params.createdTime,
      lastEditedTime: params.lastEditedTime,
      processed: true,
      decisionDetected: false,
      commitmentId: null,
      confidenceScore: null,
      decisionText: null,
    });
    return;
  }

  const conf = decision.confidence_score ?? 0;

  if (!decision.is_decision || conf < 0.5) {
    await upsertNotionCapturedPage({
      orgId: params.orgId,
      notionPageId: params.notionPageId,
      notionDatabaseId: params.notionDatabaseId,
      title: params.title,
      contentText: params.contentText,
      pageUrl: params.pageUrl,
      createdTime: params.createdTime,
      lastEditedTime: params.lastEditedTime,
      processed: true,
      decisionDetected: false,
      commitmentId: null,
      confidenceScore: conf,
      decisionText: decision.decision_text ?? null,
    });
    return;
  }

  const titleOut = (decision.decision_text || params.title).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);

  if (conf > 0.75) {
    let row;
    try {
      const ownerId = await resolveOwnerClerkId(params.orgId, decision.inferred_owner, null);
      row = await createOrgCommitmentAsOrgOwner(params.orgId, {
        title: titleOut,
        description: `From Notion (confidence ${conf.toFixed(2)})`,
        ownerId,
        deadline,
        priority,
      });
    } catch {
      return;
    }
    await upsertNotionCapturedPage({
      orgId: params.orgId,
      notionPageId: params.notionPageId,
      notionDatabaseId: params.notionDatabaseId,
      title: params.title,
      contentText: params.contentText,
      pageUrl: params.pageUrl,
      createdTime: params.createdTime,
      lastEditedTime: params.lastEditedTime,
      processed: true,
      decisionDetected: true,
      commitmentId: row.id,
      confidenceScore: conf,
      decisionText: decision.decision_text ?? null,
    });
    void broadcastOrgCommitmentEvent(params.orgId, { kind: "commitment_created", id: row.id });
    return;
  }

  await upsertNotionCapturedPage({
    orgId: params.orgId,
    notionPageId: params.notionPageId,
    notionDatabaseId: params.notionDatabaseId,
    title: params.title,
    contentText: params.contentText,
    pageUrl: params.pageUrl,
    createdTime: params.createdTime,
    lastEditedTime: params.lastEditedTime,
    processed: false,
    decisionDetected: true,
    commitmentId: null,
    confidenceScore: conf,
    decisionText: decision.decision_text ?? null,
  });
}

export async function approveNotionReviewPage(
  orgId: string,
  capturedId: string
): Promise<{ commitmentId: string } | null> {
  const cap = await getNotionCapturedById(capturedId, orgId);
  if (!cap || cap.processed || !cap.decisionDetected || cap.commitmentId) return null;

  const text = pageTextForAi(cap.title, cap.contentText);
  const decision = await detectDecisionInNotionContent(text);
  const title = (decision.decision_text || cap.title).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);
  const ownerId = await resolveOwnerClerkId(orgId, decision.inferred_owner, null);

  const row = await createOrgCommitmentAsOrgOwner(orgId, {
    title,
    description: `Approved from Notion review`,
    ownerId,
    deadline,
    priority,
  });
  await updateNotionCapturedPage(capturedId, {
    processed: true,
    decisionDetected: true,
    commitmentId: row.id,
  });
  broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
  return { commitmentId: row.id };
}

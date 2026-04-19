import { clerkClient } from "@clerk/nextjs/server";
import type { OrgEscalationRow, OrgEscalationSeverity } from "@/lib/escalations/types";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { postSlackEscalationBlockKit } from "@/lib/integrations/slack-escalation-blocks";
import { sendNotification, sendNotificationToEmail } from "@/lib/notifications/service";
import { appBaseUrl } from "@/lib/app-base-url";

function commitmentLink(commitmentId: string): string {
  return `${appBaseUrl()}/workspace/commitments?id=${encodeURIComponent(commitmentId)}`;
}

function formatDueDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

async function getOwnerDisplayName(clerkUserId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(clerkUserId);
    const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
    if (u.firstName?.trim()) return u.firstName.trim();
    if (u.username?.trim()) return u.username.trim();
    return u.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "Owner";
  } catch {
    return "Owner";
  }
}

async function getPrimaryEmail(clerkUserId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(clerkUserId);
    return u.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return null;
  }
}

async function getManagerEmail(ownerClerkId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(ownerClerkId);
    const meta = u.publicMetadata as Record<string, unknown> | undefined;
    const m = meta?.managerEmail ?? meta?.manager_email;
    if (typeof m === "string" && m.includes("@")) return m.trim();
    const priv = u.privateMetadata as Record<string, unknown> | undefined;
    const m2 = priv?.managerEmail ?? priv?.manager_email;
    if (typeof m2 === "string" && m2.includes("@")) return m2.trim();
  } catch {
    /* ignore */
  }
  return null;
}

/** Primary org admin + optional comma-separated extra admins. */
export async function collectAdminEmails(orgId: string): Promise<string[]> {
  const out = new Set<string>();
  const extra =
    process.env.ESCALATION_ADMIN_EMAILS?.trim() ||
    process.env.ESCALATION_NOTIFY_TO?.trim() ||
    "";
  for (const p of extra.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (p.includes("@")) out.add(p);
  }
  const clerkId = await getOrganizationClerkUserId(orgId);
  if (clerkId) {
    const em = await getPrimaryEmail(clerkId);
    if (em) out.add(em);
  }
  return [...out];
}

/** Org owner + escalation admins + optional `ROUTE5_EXECUTIVE_EMAILS` for weekly executive summary. */
export async function collectWeeklySummaryRecipients(orgId: string): Promise<string[]> {
  const base = await collectAdminEmails(orgId);
  const extra =
    process.env.ROUTE5_EXECUTIVE_EMAILS?.split(",")
      .map((s) => s.trim())
      .filter((e) => e.includes("@")) ?? [];
  return [...new Set([...base, ...extra])];
}

function emailBody(params: {
  title: string;
  deadline: string;
  severity: OrgEscalationSeverity;
  commitmentId: string;
}): string {
  return [
    "Action is required on a Route5 org commitment.",
    "",
    `Title: ${params.title}`,
    `Deadline: ${formatDueDate(params.deadline)}`,
    `Severity: ${params.severity}`,
    "",
    `Open commitment: ${commitmentLink(params.commitmentId)}`,
    "",
    "Please update the commitment status or complete the work before the deadline.",
  ].join("\n");
}

function subjectForSeverity(
  severity: OrgEscalationSeverity,
  title: string,
  deadlineIso: string,
  ownerName: string
): string {
  const t = title.slice(0, 80);
  const firstName = ownerName.split(/\s+/)[0] || ownerName;
  switch (severity) {
    case "warning":
      return `${firstName}, ${t} is due in 3 days — any blockers?`;
    case "urgent":
      return `${firstName}, ${t} is due tomorrow — needs your attention`;
    case "critical":
      return `Action required: ${t} due today`;
    case "overdue": {
      const days = Math.max(
        1,
        Math.floor((Date.now() - new Date(deadlineIso).getTime()) / 86_400_000)
      );
      return `${t} is now ${days} day${days === 1 ? "" : "s"} overdue — ${firstName} needs to update this`;
    }
    default:
      return `[Route5] ${t}`;
  }
}

export type EscalationNotifyContext = {
  orgId: string;
  commitmentId: string;
  title: string;
  deadline: string;
  ownerId: string;
  severity: OrgEscalationSeverity;
  escalation: OrgEscalationRow;
  isUpgrade?: boolean;
};

/**
 * Sends notifications via unified service (in-app, email, Slack DM per preferences).
 * Optional legacy channel post when Slack integration env is configured.
 */
export async function notifyEscalationCreated(ctx: EscalationNotifyContext): Promise<{
  notifiedOwnerAt: string | null;
  notifiedManagerAt: string | null;
  notifiedAdminAt: string | null;
}> {
  const { severity, title, deadline, commitmentId, ownerId, isUpgrade } = ctx;
  const ownerDisplayName = await getOwnerDisplayName(ownerId);
  const subject = subjectForSeverity(severity, title, deadline, ownerDisplayName);
  const body = [
    `${ownerDisplayName}, quick check-in from Route5.`,
    "",
    `The commitment "${title}" needs attention.`,
    `Deadline: ${formatDueDate(deadline)}`,
    `Priority level: ${severity}`,
    "",
    "If anything is blocked, add a quick status update so the team has context.",
    `Open commitment: ${commitmentLink(commitmentId)}`,
  ].join("\n");
  const link = commitmentLink(commitmentId);
  const slackPrefix = isUpgrade ? "[Escalation upgraded] " : "";
  const now = new Date().toISOString();

  let notifiedOwnerAt: string | null = null;
  let notifiedManagerAt: string | null = null;
  let notifiedAdminAt: string | null = null;

  const baseMeta: Record<string, unknown> = {
    commitmentId,
    link,
    severity,
    title,
    deadline,
    escalationId: ctx.escalation.id,
  };

  if (isUpgrade) {
    await sendNotification({
      orgId: ctx.orgId,
      userId: ownerId,
      type: "escalation_escalated",
      title: `${slackPrefix}${subject}`,
      body,
      metadata: { ...baseMeta, escalated: true },
    });
    notifiedOwnerAt = now;
  } else {
    await sendNotification({
      orgId: ctx.orgId,
      userId: ownerId,
      type: "escalation_fired",
      title: subject,
      body,
      metadata: baseMeta,
    });
    notifiedOwnerAt = now;

    if (severity === "warning" || severity === "urgent" || severity === "critical") {
      const window =
        severity === "warning" ? "72 hours" : severity === "urgent" ? "48 hours" : "24 hours";
      await sendNotification({
        orgId: ctx.orgId,
        userId: ownerId,
        type: "commitment_due_soon",
        title: `Due soon: ${title.slice(0, 70)}`,
        body: `Your commitment is due within ${window}.`,
        metadata: { ...baseMeta, window, link },
      });
    }
  }

  if (severity === "critical") {
    const mgr = await getManagerEmail(ownerId);
    if (mgr) {
      await sendNotificationToEmail({
        orgId: ctx.orgId,
        email: mgr,
        type: "escalation_escalated",
        title: subject,
        body,
        metadata: baseMeta,
      });
      notifiedManagerAt = now;
    }
  }

  if (severity === "overdue") {
    const admins = await collectAdminEmails(ctx.orgId);
    for (const em of admins) {
      await sendNotificationToEmail({
        orgId: ctx.orgId,
        email: em,
        type: "escalation_escalated",
        title: subject,
        body,
        metadata: { ...baseMeta, audience: "admin" },
      });
      notifiedAdminAt = now;
    }
  }

  void postSlackEscalationBlockKit({
    orgId: ctx.orgId,
    escalationId: ctx.escalation.id,
    commitmentId,
    title: ctx.title,
    deadline: ctx.deadline,
    severity: ctx.severity,
  }).catch(() => {
    /* optional Slack channel */
  });

  return { notifiedOwnerAt, notifiedManagerAt, notifiedAdminAt };
}

export async function notifyEscalationStale24h(params: {
  orgId: string;
  commitmentId: string;
  title: string;
  deadline: string;
  ownerId: string;
  escalation: OrgEscalationRow;
}): Promise<boolean> {
  const admins = await collectAdminEmails(params.orgId);
  if (admins.length === 0) return false;
  const subject = `Follow-up: unresolved escalation — ${params.title.slice(0, 60)}`;
  const text = [
    "An org commitment escalation has been open for over 24 hours without resolution.",
    "",
    `Title: ${params.title}`,
    `Owner: ${params.ownerId}`,
    `Deadline: ${formatDueDate(params.deadline)}`,
    "",
    `Open: ${commitmentLink(params.commitmentId)}`,
  ].join("\n");
  let any = false;
  for (const to of admins) {
    await sendNotificationToEmail({
      orgId: params.orgId,
      email: to,
      type: "escalation_escalated",
      title: subject,
      body: text,
      metadata: {
        commitmentId: params.commitmentId,
        link: commitmentLink(params.commitmentId),
        followUp: "24h",
      },
    });
    any = true;
  }
  return any;
}

export async function notifyEscalationStale48h(params: {
  orgId: string;
  commitmentId: string;
  title: string;
  deadline: string;
  ownerId: string;
  escalation: OrgEscalationRow;
}): Promise<boolean> {
  const admins = await collectAdminEmails(params.orgId);
  if (admins.length === 0) return false;
  const subject = `Escalation still open 48h — ${params.title.slice(0, 60)}`;
  const text = [
    "Reminder: a commitment escalation remains unresolved after 48 hours.",
    "",
    `Title: ${params.title}`,
    `Owner: ${params.ownerId}`,
    `Deadline: ${formatDueDate(params.deadline)}`,
    "",
    `Open: ${commitmentLink(params.commitmentId)}`,
  ].join("\n");
  let any = false;
  for (const to of admins) {
    await sendNotificationToEmail({
      orgId: params.orgId,
      email: to,
      type: "escalation_escalated",
      title: subject,
      body: text,
      metadata: {
        commitmentId: params.commitmentId,
        link: commitmentLink(params.commitmentId),
        followUp: "48h",
      },
    });
    any = true;
  }
  return any;
}

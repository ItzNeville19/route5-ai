import { clerkClient } from "@clerk/nextjs/server";
import { sendOperationalEmail } from "@/lib/notify-resend";
import { isSlackIntegrationConfigured } from "@/lib/slack-integration";
import type { OrgEscalationRow, OrgEscalationSeverity } from "@/lib/escalations/types";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { postSlackEscalationBlockKit } from "@/lib/integrations/slack-escalation-blocks";

function appBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

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

async function postSlackEscalation(text: string): Promise<boolean> {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  }
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const channel = process.env.SLACK_ESCALATION_CHANNEL_ID?.trim();
  if (token && channel) {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return Boolean(j.ok);
  }
  return false;
}

/** Best-effort DM via users.lookupByEmail + chat.postMessage(open a DM). */
async function slackDmToEmail(email: string, text: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) return false;
  const lu = await fetch(
    `https://slack.com/api/users.lookupByEmail?${new URLSearchParams({ email })}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const uj = (await lu.json().catch(() => ({}))) as { ok?: boolean; user?: { id?: string } };
  const uid = uj.ok && uj.user?.id ? uj.user.id : null;
  if (!uid) return false;
  const open = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ users: uid }),
  });
  const oj = (await open.json().catch(() => ({}))) as { ok?: boolean; channel?: { id?: string } };
  const ch = oj.ok && oj.channel?.id ? oj.channel.id : null;
  if (!ch) return false;
  const pm = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: ch, text }),
  });
  const pj = (await pm.json().catch(() => ({}))) as { ok?: boolean };
  return Boolean(pj.ok);
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
  deadlineIso: string
): string {
  const t = title.slice(0, 80);
  switch (severity) {
    case "warning":
      return `Action needed: ${t} due in 72 hours`;
    case "urgent":
      return `Urgent: ${t} due in 48 hours`;
    case "critical":
      return `Critical: ${t} due in 24 hours`;
    case "overdue": {
      const d = formatDueDate(deadlineIso);
      return `Overdue: ${t} was due on ${d}`;
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
  /** When true, still send owner line but mark as upgrade in Slack text */
  isUpgrade?: boolean;
};

/**
 * Sends emails (Resend) and optional Slack per severity. Updates notification timestamps on the row via caller.
 */
export async function notifyEscalationCreated(ctx: EscalationNotifyContext): Promise<{
  notifiedOwnerAt: string | null;
  notifiedManagerAt: string | null;
  notifiedAdminAt: string | null;
}> {
  const { severity, title, deadline, commitmentId, ownerId, isUpgrade } = ctx;
  const subject = subjectForSeverity(severity, title, deadline);
  const body = emailBody({ title, deadline, severity, commitmentId });
  const slackPrefix = isUpgrade ? "[Escalation upgraded] " : "";

  let notifiedOwnerAt: string | null = null;
  let notifiedManagerAt: string | null = null;
  let notifiedAdminAt: string | null = null;

  const ownerEmail = await getPrimaryEmail(ownerId);
  if (ownerEmail) {
    const r = await sendOperationalEmail({ to: ownerEmail, subject, text: body });
    if (r.sent) notifiedOwnerAt = new Date().toISOString();
  }

  const slackText = `${slackPrefix}${subject}\n${commitmentLink(commitmentId)}`;

  if (severity === "warning") {
    return { notifiedOwnerAt, notifiedManagerAt, notifiedAdminAt };
  }

  if (severity === "urgent" || severity === "critical" || severity === "overdue") {
    if (isSlackIntegrationConfigured() && ownerEmail) {
      const dm = await slackDmToEmail(ownerEmail, slackText);
      if (!dm) await postSlackEscalation(slackText);
    }
  }

  if (severity === "critical") {
    const mgr = await getManagerEmail(ownerId);
    if (mgr) {
      const r = await sendOperationalEmail({ to: mgr, subject, text: body });
      if (r.sent) notifiedManagerAt = new Date().toISOString();
    }
  }

  if (severity === "overdue") {
    const admins = await collectAdminEmails(ctx.orgId);
    for (const em of admins) {
      const r = await sendOperationalEmail({ to: em, subject, text: body });
      if (r.sent) notifiedAdminAt = new Date().toISOString();
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
    const r = await sendOperationalEmail({ to, subject, text });
    if (r.sent) any = true;
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
    const r = await sendOperationalEmail({ to, subject, text });
    if (r.sent) any = true;
  }
  return any;
}

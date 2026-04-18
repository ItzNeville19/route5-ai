/**
 * Operational email via Resend (https://resend.com). Server-only; never expose API key to the client.
 * Set RESEND_API_KEY and ESCALATION_NOTIFY_TO (recipient) for escalation emails.
 */

import { appBaseUrl } from "@/lib/app-base-url";

export type SendResult = { sent: boolean; reason?: string };

export async function sendOperationalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() || "Route5 <onboarding@resend.dev>";
  if (!key) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      ...(params.html ? { html: params.html } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { sent: false, reason: err || `HTTP ${res.status}` };
  }
  return { sent: true };
}

export async function notifyEscalationEmail(payload: {
  commitmentTitle: string;
  projectId: string;
  commitmentId: string;
  reason: string;
  newStatus: string;
}): Promise<SendResult> {
  const to = process.env.ESCALATION_NOTIFY_TO?.trim();
  if (!to) {
    return { sent: false, reason: "ESCALATION_NOTIFY_TO not set" };
  }
  const desk = `${appBaseUrl()}/desk?projectId=${encodeURIComponent(payload.projectId)}`;
  return sendOperationalEmail({
    to,
    subject: `[Route5] Escalation: ${payload.commitmentTitle.slice(0, 80)}`,
    text: [
      `Reason: ${payload.reason}`,
      `New status: ${payload.newStatus}`,
      `Commitment: ${payload.commitmentTitle}`,
      `Open in Desk: ${desk}`,
      "",
      `IDs: project=${payload.projectId} commitment=${payload.commitmentId}`,
    ].join("\n"),
  });
}

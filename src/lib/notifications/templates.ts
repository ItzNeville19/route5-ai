import type { NotificationType } from "@/lib/notifications/types";
import { appBaseUrl } from "@/lib/app-base-url";

function shell(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#0c0c0f;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0f;padding:24px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="padding:20px 24px;background:linear-gradient(135deg,#1e1b4b 0%,#0f172a 100%);border-bottom:1px solid rgba(139,92,246,0.25);">
<strong style="font-size:16px;color:#fafafa;">Route5</strong>
</td></tr>
<tr><td style="padding:24px;font-size:14px;line-height:1.6;color:#d4d4d8;">
${inner}
</td></tr>
<tr><td style="padding:16px 24px;font-size:11px;color:#71717a;border-top:1px solid rgba(255,255,255,0.06);">
You’re receiving operational mail from Route5. Manage preferences in the app under Notification preferences.
</td></tr>
</table>
</td></tr></table></body></html>`;
}

function primaryCta(href: string, label: string): string {
  return `<p style="margin:16px 0 0;"><a href="${escapeAttr(href)}" style="display:inline-block;border-radius:10px;background:#a78bfa;color:#0c0c0f;font-weight:700;text-decoration:none;padding:10px 14px;">${escapeHtml(label)}</a></p>`;
}

export function buildNotificationEmailHtml(
  type: NotificationType,
  params: {
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }
): { subject: string; html: string; text: string } {
  const meta = params.metadata ?? {};
  const base = appBaseUrl();
  const subject = params.title.slice(0, 200);
  let inner = `<p style="margin:0 0 12px;font-weight:600;color:#fafafa;">${escapeHtml(params.title)}</p>
<p style="margin:0 0 16px;">${escapeHtml(params.body)}</p>`;

  const link = typeof meta.link === "string" ? meta.link : null;
  if (link) {
    inner += `<p style="margin:16px 0 0;"><a href="${escapeAttr(link)}" style="color:#a78bfa;font-weight:600;">Open in Route5 →</a></p>`;
  }

  switch (type) {
    case "commitment_assigned": {
      const deadline = meta.deadline ? String(meta.deadline) : "";
      const priority = meta.priority ? String(meta.priority) : "";
      inner += `<p style="margin:12px 0 0;font-size:13px;color:#a1a1aa;">Deadline: ${escapeHtml(deadline)}<br/>Priority: ${escapeHtml(priority)}</p>`;
      break;
    }
    case "commitment_due_soon": {
      const windowLabel = meta.window ? String(meta.window) : "";
      inner += `<p style="margin:12px 0 0;font-size:13px;color:#fbbf24;">Due soon (${escapeHtml(windowLabel)})</p>`;
      break;
    }
    case "commitment_overdue": {
      inner += `<p style="margin:12px 0 0;font-size:13px;color:#f87171;">This commitment is overdue.</p>`;
      break;
    }
    case "escalation_fired":
    case "escalation_escalated": {
      const sev = meta.severity ? String(meta.severity) : "";
      inner += `<p style="margin:12px 0 0;font-size:13px;">Severity: ${escapeHtml(sev)}</p>`;
      break;
    }
    case "payment_failed": {
      inner += `<p style="margin:12px 0 0;font-size:13px;color:#f87171;">Update your payment method to avoid losing access.</p>
<p style="margin:8px 0 0;"><a href="${escapeAttr(`${base}/workspace/billing`)}" style="color:#a78bfa;">Billing →</a></p>`;
      break;
    }
    case "subscription_cancelled": {
      inner += `<p style="margin:12px 0 0;font-size:13px;">You can resubscribe anytime from Billing.</p>`;
      break;
    }
    case "trial_ending": {
      inner += `<p style="margin:12px 0 0;font-size:13px;">Upgrade before the trial ends to keep integrations and exports.</p>`;
      break;
    }
    case "team_invited": {
      const inviteUrl =
        typeof meta.inviteUrl === "string"
          ? meta.inviteUrl
          : typeof meta.signupUrl === "string"
            ? meta.signupUrl
            : `${base}/sign-up`;
      inner += primaryCta(inviteUrl, "Join organization");
      break;
    }
    case "security_login_alert": {
      const signInAt = typeof meta.signInAt === "string" ? meta.signInAt : null;
      const device = typeof meta.device === "string" ? meta.device : "Unknown device";
      const location = typeof meta.location === "string" ? meta.location : "Unknown location";
      inner += `<p style="margin:12px 0 0;font-size:13px;color:#a1a1aa;">Device: ${escapeHtml(device)}<br/>Location: ${escapeHtml(location)}${
        signInAt ? `<br/>Time: ${escapeHtml(signInAt)}` : ""
      }</p>`;
      inner += primaryCta(`${base}/settings`, "Review account access");
      break;
    }
    case "marketing_product_updates": {
      const ctaUrl = typeof meta.ctaUrl === "string" ? meta.ctaUrl : `${base}/product`;
      const ctaLabel = typeof meta.ctaLabel === "string" ? meta.ctaLabel : "Explore new releases";
      inner += `<div style="margin:14px 0 0;border:1px solid rgba(167,139,250,0.35);background:rgba(167,139,250,0.08);border-radius:12px;padding:12px;">`;
      inner += `<p style="margin:0;font-size:13px;color:#ddd6fe;">Latest updates are now live in your workspace. Roll them out to your team and keep execution momentum high.</p>`;
      inner += `</div>`;
      inner += primaryCta(ctaUrl, ctaLabel);
      break;
    }
    case "marketing_feature_tips": {
      const ctaUrl = typeof meta.ctaUrl === "string" ? meta.ctaUrl : `${base}/workspace/help`;
      const ctaLabel = typeof meta.ctaLabel === "string" ? meta.ctaLabel : "See workflow playbook";
      inner += `<div style="margin:14px 0 0;border:1px solid rgba(34,197,94,0.35);background:rgba(34,197,94,0.08);border-radius:12px;padding:12px;">`;
      inner += `<p style="margin:0;font-size:13px;color:#bbf7d0;">Pro tip: route decisions through Capture, assign owners in Feed, and check Daily Digest each morning to prevent hidden blockers.</p>`;
      inner += `</div>`;
      inner += primaryCta(ctaUrl, ctaLabel);
      break;
    }
    case "weekly_summary":
    default:
      break;
  }

  const html = shell(inner);
  const text = `${params.title}\n\n${params.body}${link ? `\n\n${link}` : ""}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

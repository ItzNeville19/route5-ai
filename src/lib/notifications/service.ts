import { clerkClient } from "@clerk/nextjs/server";
import { sendOperationalEmail } from "@/lib/notify-resend";
import { getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { decryptSecret } from "@/lib/integrations/token-crypto";
import { broadcastUserNotification } from "@/lib/notifications/broadcast";
import {
  insertOrgNotification,
  listPreferencesForUser,
} from "@/lib/notifications/store";
import { buildNotificationEmailHtml } from "@/lib/notifications/templates";
import type { NotificationType } from "@/lib/notifications/types";
import { slackDmWithToken } from "@/lib/notifications/slack-dm";

export type SendNotificationParams = {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  /** Applied after preference lookup */
  forceChannels?: Partial<{ inApp: boolean; email: boolean; slack: boolean }>;
};

async function getEffectiveChannels(
  orgId: string,
  userId: string,
  type: NotificationType
): Promise<{ inApp: boolean; email: boolean; slack: boolean }> {
  const prefs = await listPreferencesForUser(orgId, userId);
  const row = prefs.find((p) => p.type === type);
  if (!row) {
    return { inApp: true, email: true, slack: true };
  }
  return { inApp: row.inApp, email: row.email, slack: row.slack };
}

async function resolveSlackBotTokenForOrg(orgId: string): Promise<string | null> {
  const integ = await getSlackIntegrationForOrg(orgId);
  if (!integ || integ.status !== "connected") {
    return process.env.SLACK_BOT_TOKEN?.trim() || null;
  }
  try {
    return decryptSecret(integ.accessTokenEncrypted);
  } catch {
    return process.env.SLACK_BOT_TOKEN?.trim() || null;
  }
}

/**
 * Primary entry: in-app row + optional email + optional Slack DM, filtered by preferences.
 * Channels run concurrently; failures are isolated and logged.
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const meta = params.metadata ?? {};
  const baseCh = await getEffectiveChannels(params.orgId, params.userId, params.type);
  const inApp = params.forceChannels?.inApp ?? baseCh.inApp;
  const email = params.forceChannels?.email ?? baseCh.email;
  const slack = params.forceChannels?.slack ?? baseCh.slack;

  const tasks: Promise<void>[] = [];

  if (inApp) {
    tasks.push(
      (async () => {
        try {
          const id = await insertOrgNotification({
            orgId: params.orgId,
            userId: params.userId,
            type: params.type,
            title: params.title,
            body: params.body,
            metadata: meta,
          });
          broadcastUserNotification(params.userId, {
            id,
            type: params.type,
            t: Date.now(),
          });
          console.log(
            JSON.stringify({
              channel: "in_app",
              ok: true,
              notificationId: id,
              type: params.type,
              userId: params.userId,
            })
          );
        } catch (e) {
          console.error(
            JSON.stringify({
              channel: "in_app",
              ok: false,
              type: params.type,
              error: e instanceof Error ? e.message : String(e),
            })
          );
        }
      })()
    );
  }

  if (email) {
    tasks.push(
      (async () => {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(params.userId);
          const addr =
            user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
          if (!addr) {
            console.log(JSON.stringify({ channel: "email", ok: false, reason: "no_address" }));
            return;
          }
          let subject: string;
          let html: string;
          let text: string;
          if (params.type === "weekly_summary" && typeof meta.weeklyHtml === "string") {
            subject = params.title.slice(0, 200);
            html = meta.weeklyHtml as string;
            text = params.body;
          } else {
            const built = buildNotificationEmailHtml(params.type, {
              title: params.title,
              body: params.body,
              metadata: meta,
            });
            subject = built.subject;
            html = built.html;
            text = built.text;
          }
          const r = await sendOperationalEmail({ to: addr, subject, text, html });
          console.log(
            JSON.stringify({
              channel: "email",
              ok: r.sent,
              reason: r.reason,
              type: params.type,
            })
          );
        } catch (e) {
          console.error(
            JSON.stringify({
              channel: "email",
              ok: false,
              type: params.type,
              error: e instanceof Error ? e.message : String(e),
            })
          );
        }
      })()
    );
  }

  if (slack) {
    tasks.push(
      (async () => {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(params.userId);
          const addr =
            user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
          if (!addr) {
            console.log(JSON.stringify({ channel: "slack", ok: false, reason: "no_address" }));
            return;
          }
          const token = await resolveSlackBotTokenForOrg(params.orgId);
          if (!token) {
            console.log(JSON.stringify({ channel: "slack", ok: false, reason: "no_token" }));
            return;
          }
          const link = typeof meta.link === "string" ? `\n${meta.link}` : "";
          const text = `${params.title}\n${params.body}${link}`;
          const ok = await slackDmWithToken(token, addr, text);
          console.log(JSON.stringify({ channel: "slack", ok, type: params.type }));
        } catch (e) {
          console.error(
            JSON.stringify({
              channel: "slack",
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            })
          );
        }
      })()
    );
  }

  await Promise.allSettled(tasks);
}

/** Resolve Clerk user by email; send full notification if found, else email-only (no preferences). */
export async function sendNotificationToEmail(params: {
  orgId: string;
  email: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  htmlOverride?: string;
}): Promise<void> {
  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({
      emailAddress: [params.email.trim().toLowerCase()],
    });
    const uid = list.data[0]?.id;
    if (uid) {
      const meta = { ...(params.metadata ?? {}) };
      if (params.htmlOverride) meta.weeklyHtml = params.htmlOverride;
      await sendNotification({
        orgId: params.orgId,
        userId: uid,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata: meta,
      });
      return;
    }
  } catch {
    /* fall through */
  }
  const built = buildNotificationEmailHtml(params.type, {
    title: params.title,
    body: params.body,
    metadata: params.metadata ?? {},
  });
  const html = params.htmlOverride ?? built.html;
  const r = await sendOperationalEmail({
    to: params.email,
    subject: built.subject,
    text: built.text,
    html,
  });
  console.log(
    JSON.stringify({
      channel: "email_only",
      ok: r.sent,
      reason: r.reason,
      type: params.type,
      email: params.email,
    })
  );
}

export async function resolveClerkUserIdByEmail(email: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({
      emailAddress: [email.trim().toLowerCase()],
    });
    return list.data[0]?.id ?? null;
  } catch {
    return null;
  }
}

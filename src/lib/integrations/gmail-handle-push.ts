import { getValidGmailAccessToken } from "@/lib/integrations/gmail-token";
import {
  getGmailIntegrationByEmail,
  getGmailWatchForOrg,
  touchGmailIntegrationUsed,
  upsertGmailWatchRow,
} from "@/lib/integrations/org-integrations-store";
import { gmailHistoryList, gmailMessagesGet, parseGmailMessage } from "@/lib/integrations/gmail-google";
import { processGmailInboundEmail } from "@/lib/integrations/gmail-process-email";

type PubSubPushBody = {
  message?: { data?: string; attributes?: Record<string, string> };
  subscription?: string;
};

function verifyPubSubToken(req: Request): boolean {
  const expected = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN?.trim();
  if (!expected) return true;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;
  const q = new URL(req.url).searchParams.get("token");
  return q === expected;
}

export async function handleGmailPubSubPush(req: Request): Promise<{ ok: boolean; status: number; detail?: string }> {
  if (!verifyPubSubToken(req)) {
    return { ok: false, status: 401, detail: "unauthorized" };
  }

  let body: PubSubPushBody;
  try {
    body = (await req.json()) as PubSubPushBody;
  } catch {
    return { ok: false, status: 400, detail: "invalid json" };
  }

  const dataB64 = body.message?.data;
  if (!dataB64) {
    return { ok: true, status: 200, detail: "no data (ack)" };
  }

  let inner: { emailAddress?: string; historyId?: string };
  try {
    inner = JSON.parse(Buffer.from(dataB64, "base64").toString("utf8")) as {
      emailAddress?: string;
      historyId?: string;
    };
  } catch {
    return { ok: false, status: 400, detail: "bad message data" };
  }

  const email = inner.emailAddress?.trim().toLowerCase();
  const newHistoryTip = inner.historyId?.trim();
  if (!email || !newHistoryTip) {
    return { ok: true, status: 200, detail: "noop" };
  }

  const integration = await getGmailIntegrationByEmail(email);
  if (!integration) {
    return { ok: true, status: 200, detail: "no integration" };
  }

  const orgId = integration.orgId;
  const token = await getValidGmailAccessToken(integration);
  if (!token) {
    return { ok: false, status: 503, detail: "no token" };
  }

  await touchGmailIntegrationUsed(orgId);

  const watch = await getGmailWatchForOrg(orgId);
  if (!watch) {
    await upsertGmailWatchRow({
      orgId,
      historyId: newHistoryTip,
      expirationIso: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
    });
    return { ok: true, status: 200, detail: "watch init" };
  }

  const startId = watch.historyId;
  let list;
  try {
    list = await gmailHistoryList(token, startId);
  } catch {
    return { ok: false, status: 500, detail: "history failed" };
  }

  if (list.staleHistory) {
    await upsertGmailWatchRow({
      orgId,
      historyId: newHistoryTip,
      expirationIso: watch.expiration,
    });
    return { ok: true, status: 200, detail: "stale history reset" };
  }

  const messageIds = new Set<string>();
  for (const h of list.history ?? []) {
    for (const add of h.messagesAdded ?? []) {
      const mid = add.message?.id;
      if (mid) messageIds.add(mid);
    }
  }

  for (const mid of messageIds) {
    try {
      const raw = await gmailMessagesGet(token, mid);
      const parsed = parseGmailMessage(raw);
      await processGmailInboundEmail({
        orgId,
        gmailMessageId: parsed.gmailMessageId,
        gmailThreadId: parsed.gmailThreadId,
        fromEmail: parsed.fromEmail,
        fromName: parsed.fromName,
        subject: parsed.subject,
        bodyText: parsed.bodyText,
        receivedAt: parsed.receivedAt,
      });
    } catch {
      /* skip message */
    }
  }

  await upsertGmailWatchRow({
    orgId,
    historyId: newHistoryTip,
    expirationIso: watch.expiration,
  });

  return { ok: true, status: 200, detail: `processed ${messageIds.size}` };
}

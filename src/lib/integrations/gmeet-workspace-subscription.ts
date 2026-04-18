import { mergeGmailIntegrationMetadata } from "@/lib/integrations/org-integrations-store";
import type { OrgIntegrationMetadata } from "@/lib/integrations/types";

const WORKSPACE_EVENTS = "https://workspaceevents.googleapis.com/v1";

export async function fetchGoogleOAuthSub(accessToken: string): Promise<string | null> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!res.ok) return null;
  const j = (await res.json()) as { sub?: string };
  return j.sub?.trim() ?? null;
}

async function pollOperationDone(
  accessToken: string,
  operationName: string,
  maxAttempts = 15
): Promise<Record<string, unknown> | null> {
  const path = operationName.replace(/^\//, "");
  for (let i = 0; i < maxAttempts; i++) {
    const r = await fetch(`${WORKSPACE_EVENTS}/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const op = (await r.json()) as {
      done?: boolean;
      response?: Record<string, unknown>;
      name?: string;
    };
    if (op.done && op.response) return op.response;
    if (op.done && !op.response) return null;
    await new Promise((res) => setTimeout(res, 800));
  }
  return null;
}

/**
 * Creates a Workspace Events subscription (Meet → Pub/Sub) when
 * GOOGLE_WORKSPACE_EVENTS_PUBSUB_TOPIC is set (full `projects/.../topics/...` name).
 */
export async function ensureMeetWorkspaceEventsSubscription(
  orgId: string,
  accessToken: string,
  googleUserSub: string
): Promise<void> {
  const topic = process.env.GOOGLE_WORKSPACE_EVENTS_PUBSUB_TOPIC?.trim();
  if (!topic) return;

  const targetResource = `//cloudidentity.googleapis.com/users/${googleUserSub}`;
  const body = {
    targetResource,
    eventTypes: ["google.workspace.meet.transcript.v2.fileGenerated"],
    notificationEndpoint: { pubsubTopic: topic },
    payloadOptions: { includeResource: false },
  };

  const res = await fetch(`${WORKSPACE_EVENTS}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return;

  const first = (await res.json()) as {
    name?: string;
    done?: boolean;
    response?: { name?: string; expireTime?: string };
  };

  let subName: string | undefined;
  let expireTime: string | undefined;

  if (first.done && first.response?.name) {
    subName = first.response.name;
    expireTime = first.response.expireTime;
  } else if (first.name) {
    const done = await pollOperationDone(accessToken, first.name);
    const resp = done as { name?: string; expireTime?: string } | null;
    if (resp?.name) {
      subName = resp.name;
      expireTime = resp.expireTime;
    }
  }

  if (!subName) return;

  const patch: Partial<OrgIntegrationMetadata> = {
    gmeet_workspace_subscription_name: subName,
    gmeet_workspace_subscription_expire_time: expireTime ?? null,
  };
  await mergeGmailIntegrationMetadata(orgId, patch);
}

function parseExpireMs(meta: OrgIntegrationMetadata): number | null {
  const raw = meta.gmeet_workspace_subscription_expire_time?.trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** Extends subscription expiry before it lapses (subscriptions cannot be reactivated after expiry). */
export async function renewMeetWorkspaceSubscriptionIfNeeded(
  orgId: string,
  accessToken: string,
  meta: OrgIntegrationMetadata
): Promise<void> {
  const name = meta.gmeet_workspace_subscription_name?.trim();
  if (!name) return;

  const expMs = parseExpireMs(meta);
  const renewBeforeMs = 48 * 3600 * 1000;
  if (expMs != null && expMs - Date.now() > renewBeforeMs) return;

  const resourcePath = name.replace(/^\//, "");
  const newExpire = new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString();

  const url = `${WORKSPACE_EVENTS}/${resourcePath}?updateMask=expireTime`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expireTime: newExpire }),
  });

  if (!res.ok) return;
  const updated = (await res.json()) as { expireTime?: string };
  await mergeGmailIntegrationMetadata(orgId, {
    gmeet_workspace_subscription_expire_time: updated.expireTime ?? newExpire,
  });
}

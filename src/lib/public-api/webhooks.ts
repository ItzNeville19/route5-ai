import { createHmac, randomUUID } from "crypto";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { sendNotification } from "@/lib/notifications/service";
import { isDeveloperToolsEnabled } from "@/lib/feature-flags";
import type { WebhookEventType } from "@/lib/public-api/types";
import {
  getWebhookEndpoint,
  insertWebhookDelivery,
  listWebhookEndpointsForOrg,
  updateWebhookDelivery,
  setWebhookEndpointEnabled,
  getWebhookDeliveryById,
} from "@/lib/public-api/webhooks-store";

const RETRY_MS = [60_000, 300_000, 1_800_000, 7_200_000, 28_800_000];
const MAX_ATTEMPTS = 5;
const POST_TIMEOUT_MS = 5000;

function endpointWantsEvent(endpointEvents: string[], eventType: WebhookEventType): boolean {
  if (endpointEvents.length === 0) return false;
  return endpointEvents.includes(eventType);
}

function signBody(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

async function postToEndpoint(
  url: string,
  secret: string,
  bodyObj: Record<string, unknown>
): Promise<{ ok: boolean; status: number; bodySnippet: string }> {
  const rawBody = JSON.stringify(bodyObj);
  const sig = signBody(secret, rawBody);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), POST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Route5-Signature": `sha256=${sig}`,
        "User-Agent": "Route5-Webhooks/1.0",
      },
      body: rawBody,
      signal: ac.signal,
    });
    const text = await res.text();
    const snippet = text.slice(0, 8000);
    return { ok: res.ok, status: res.status, bodySnippet: snippet };
  } catch {
    return { ok: false, status: 0, bodySnippet: "(network error or timeout)" };
  } finally {
    clearTimeout(t);
  }
}

export async function deliverWebhookEvent(
  orgId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  let endpoints: Awaited<ReturnType<typeof listWebhookEndpointsForOrg>>;
  try {
    endpoints = await listWebhookEndpointsForOrg(orgId);
  } catch {
    return;
  }
  const createdAt = new Date().toISOString();
  const eventId = randomUUID();

  for (const ep of endpoints) {
    if (!ep.enabled) continue;
    if (!endpointWantsEvent(ep.events, eventType)) continue;

    const payload = {
      id: eventId,
      type: eventType,
      created_at: createdAt,
      data,
    };

    const result = await postToEndpoint(ep.url, ep.secret, payload);

    await insertWebhookDelivery({
      orgId,
      webhookEndpointId: ep.id,
      eventType,
      payload,
      attemptCount: 1,
      responseStatus: result.status,
      responseBody: result.bodySnippet,
      deliveredAt: result.ok ? new Date().toISOString() : null,
      failedAt: null,
      nextRetryAt: result.ok ? null : new Date(Date.now() + RETRY_MS[0]).toISOString(),
    });
  }
}

/** Process one delivery retry (cron or internal). */
export async function processWebhookDeliveryRetry(deliveryId: string): Promise<void> {
  const row = await getWebhookDeliveryById(deliveryId);
  if (!row || row.deliveredAt || row.failedAt) return;

  const ep = await getWebhookEndpoint(row.orgId, row.webhookEndpointId);
  if (!ep || !ep.enabled) {
    await updateWebhookDelivery(deliveryId, {
      failedAt: new Date().toISOString(),
      nextRetryAt: null,
    });
    return;
  }

  const payload = row.payload;
  const result = await postToEndpoint(ep.url, ep.secret, {
    ...payload,
  });

  const attempts = row.attemptCount + 1;

  if (result.ok) {
    await updateWebhookDelivery(deliveryId, {
      attemptCount: attempts,
      responseStatus: result.status,
      responseBody: result.bodySnippet,
      deliveredAt: new Date().toISOString(),
      nextRetryAt: null,
    });
    return;
  }

  if (attempts >= MAX_ATTEMPTS) {
    await updateWebhookDelivery(deliveryId, {
      attemptCount: attempts,
      responseStatus: result.status,
      responseBody: result.bodySnippet,
      failedAt: new Date().toISOString(),
      nextRetryAt: null,
    });
    await setWebhookEndpointEnabled(row.orgId, ep.id, false);
    const owner = await getOrganizationClerkUserId(row.orgId);
    if (owner) {
      const link = isDeveloperToolsEnabled() ? "/workspace/developer" : "/settings";
      void sendNotification({
        orgId: row.orgId,
        userId: owner,
        type: "escalation_escalated",
        title: "Webhook endpoint disabled",
        body: `Endpoint ${ep.url.slice(0, 80)} was disabled after ${MAX_ATTEMPTS} failed delivery attempts.`,
        metadata: { link, webhookEndpointId: ep.id },
      });
    }
    return;
  }

  const delay = RETRY_MS[Math.min(attempts - 1, RETRY_MS.length - 1)];
  await updateWebhookDelivery(deliveryId, {
    attemptCount: attempts,
    responseStatus: result.status,
    responseBody: result.bodySnippet,
    nextRetryAt: new Date(Date.now() + delay).toISOString(),
  });
}

/** Send a test ping (not tied to subscription). */
export async function deliverWebhookTest(orgId: string, endpointId: string): Promise<{ ok: boolean; status: number }> {
  const ep = await getWebhookEndpoint(orgId, endpointId);
  if (!ep) return { ok: false, status: 404 };
  const payload = {
    id: randomUUID(),
    type: "webhook.test",
    created_at: new Date().toISOString(),
    data: { message: "Route5 webhook test" },
  };
  const result = await postToEndpoint(ep.url, ep.secret, payload);
  await insertWebhookDelivery({
    orgId,
    webhookEndpointId: ep.id,
    eventType: "webhook.test",
    payload,
    attemptCount: 1,
    responseStatus: result.status,
    responseBody: result.bodySnippet,
    deliveredAt: result.ok ? new Date().toISOString() : null,
    failedAt: result.ok ? null : new Date().toISOString(),
    nextRetryAt: null,
  });
  return { ok: result.ok, status: result.status };
}

import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import type { WebhookEventType } from "@/lib/public-api/types";

export type WebhookEndpointRow = {
  id: string;
  orgId: string;
  url: string;
  description: string | null;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookDeliveryRow = {
  id: string;
  orgId: string;
  webhookEndpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  attemptCount: number;
  deliveredAt: string | null;
  failedAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
};

function mapEp(r: Record<string, unknown>): WebhookEndpointRow {
  const ev = r.events;
  let events: string[] = [];
  if (Array.isArray(ev)) events = ev.map(String);
  else if (typeof ev === "string") {
    try {
      const p = JSON.parse(ev) as unknown;
      if (Array.isArray(p)) events = p.map(String);
    } catch {
      /* ignore */
    }
  }
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    url: String(r.url),
    description: r.description == null ? null : String(r.description),
    secret: String(r.secret),
    events,
    enabled: r.enabled === true || r.enabled === 1,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapDel(r: Record<string, unknown>): WebhookDeliveryRow {
  let payload: Record<string, unknown> = {};
  const p = r.payload;
  if (p && typeof p === "object" && !Array.isArray(p)) payload = p as Record<string, unknown>;
  else if (typeof p === "string") {
    try {
      payload = JSON.parse(p) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    webhookEndpointId: String(r.webhook_endpoint_id),
    eventType: String(r.event_type),
    payload,
    responseStatus: r.response_status == null ? null : Number(r.response_status),
    responseBody: r.response_body == null ? null : String(r.response_body),
    attemptCount: Number(r.attempt_count ?? 0),
    deliveredAt: r.delivered_at == null ? null : String(r.delivered_at),
    failedAt: r.failed_at == null ? null : String(r.failed_at),
    nextRetryAt: r.next_retry_at == null ? null : String(r.next_retry_at),
    createdAt: String(r.created_at),
  };
}

export async function listWebhookEndpointsForOrg(orgId: string): Promise<WebhookEndpointRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((x) => mapEp(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT * FROM webhook_endpoints WHERE org_id = ? ORDER BY created_at DESC`)
    .all(orgId) as Record<string, unknown>[];
  return rows.map(mapEp);
}

export async function getWebhookEndpoint(orgId: string, id: string): Promise<WebhookEndpointRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapEp(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM webhook_endpoints WHERE org_id = ? AND id = ?`)
    .get(orgId, id) as Record<string, unknown> | undefined;
  return row ? mapEp(row) : null;
}

export async function insertWebhookEndpoint(params: {
  orgId: string;
  url: string;
  description: string | null;
  secret: string;
  events: WebhookEventType[];
}): Promise<WebhookEndpointRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const eventsJson = JSON.stringify(params.events);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .insert({
        id,
        org_id: params.orgId,
        url: params.url,
        description: params.description,
        secret: params.secret,
        events: params.events,
        enabled: true,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapEp(data as Record<string, unknown>);
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO webhook_endpoints (id, org_id, url, description, secret, events, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.url,
    params.description,
    params.secret,
    eventsJson,
    now,
    now
  );
  const row = d.prepare(`SELECT * FROM webhook_endpoints WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapEp(row);
}

export async function updateWebhookEndpoint(
  orgId: string,
  id: string,
  patch: Partial<{ url: string; description: string | null; events: string[]; enabled: boolean }>
): Promise<WebhookEndpointRow | null> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row: Record<string, unknown> = { updated_at: now };
    if (patch.url !== undefined) row.url = patch.url;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.events !== undefined) row.events = patch.events;
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .update(row)
      .eq("org_id", orgId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? mapEp(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const existing = d.prepare(`SELECT * FROM webhook_endpoints WHERE id = ? AND org_id = ?`).get(id, orgId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return null;
  const url = patch.url !== undefined ? patch.url : String(existing.url);
  const description = patch.description !== undefined ? patch.description : existing.description;
  const events =
    patch.events !== undefined ? JSON.stringify(patch.events) : String(existing.events);
  const enabled = patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : Number(existing.enabled);
  d.prepare(
    `UPDATE webhook_endpoints SET url = ?, description = ?, events = ?, enabled = ?, updated_at = ? WHERE id = ? AND org_id = ?`
  ).run(url, description, events, enabled, now, id, orgId);
  const row = d.prepare(`SELECT * FROM webhook_endpoints WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapEp(row);
}

export async function deleteWebhookEndpoint(orgId: string, id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("webhook_endpoints").delete().eq("org_id", orgId).eq("id", id);
    if (error) throw error;
    return true;
  }
  const d = getSqliteHandle();
  const r = d.prepare(`DELETE FROM webhook_endpoints WHERE org_id = ? AND id = ?`).run(orgId, id);
  return r.changes > 0;
}

export async function setWebhookEndpointEnabled(orgId: string, id: string, enabled: boolean): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase
      .from("webhook_endpoints")
      .update({ enabled, updated_at: now })
      .eq("org_id", orgId)
      .eq("id", id);
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`UPDATE webhook_endpoints SET enabled = ?, updated_at = ? WHERE org_id = ? AND id = ?`).run(
    enabled ? 1 : 0,
    now,
    orgId,
    id
  );
}

export async function insertWebhookDelivery(params: {
  orgId: string;
  webhookEndpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attemptCount: number;
  responseStatus: number | null;
  responseBody: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  nextRetryAt: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const payloadJson = JSON.stringify(params.payload);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("webhook_deliveries").insert({
      id,
      org_id: params.orgId,
      webhook_endpoint_id: params.webhookEndpointId,
      event_type: params.eventType,
      payload: params.payload,
      response_status: params.responseStatus,
      response_body: params.responseBody,
      attempt_count: params.attemptCount,
      delivered_at: params.deliveredAt,
      failed_at: params.failedAt,
      next_retry_at: params.nextRetryAt,
      created_at: now,
    });
    if (error) throw error;
    return id;
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO webhook_deliveries (id, org_id, webhook_endpoint_id, event_type, payload, response_status, response_body, attempt_count, delivered_at, failed_at, next_retry_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.webhookEndpointId,
    params.eventType,
    payloadJson,
    params.responseStatus,
    params.responseBody,
    params.attemptCount,
    params.deliveredAt,
    params.failedAt,
    params.nextRetryAt,
    now
  );
  return id;
}

export async function updateWebhookDelivery(
  id: string,
  patch: Partial<{
    responseStatus: number | null;
    responseBody: string | null;
    attemptCount: number;
    deliveredAt: string | null;
    failedAt: string | null;
    nextRetryAt: string | null;
  }>
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row: Record<string, unknown> = {};
    if (patch.responseStatus !== undefined) row.response_status = patch.responseStatus;
    if (patch.responseBody !== undefined) row.response_body = patch.responseBody;
    if (patch.attemptCount !== undefined) row.attempt_count = patch.attemptCount;
    if (patch.deliveredAt !== undefined) row.delivered_at = patch.deliveredAt;
    if (patch.failedAt !== undefined) row.failed_at = patch.failedAt;
    if (patch.nextRetryAt !== undefined) row.next_retry_at = patch.nextRetryAt;
    await supabase.from("webhook_deliveries").update(row).eq("id", id);
    return;
  }
  const d = getSqliteHandle();
  const cur = d.prepare(`SELECT * FROM webhook_deliveries WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!cur) return;
  d.prepare(
    `UPDATE webhook_deliveries SET response_status = ?, response_body = ?, attempt_count = ?, delivered_at = ?, failed_at = ?, next_retry_at = ? WHERE id = ?`
  ).run(
    patch.responseStatus !== undefined ? patch.responseStatus : cur.response_status,
    patch.responseBody !== undefined ? patch.responseBody : cur.response_body,
    patch.attemptCount !== undefined ? patch.attemptCount : cur.attempt_count,
    patch.deliveredAt !== undefined ? patch.deliveredAt : cur.delivered_at,
    patch.failedAt !== undefined ? patch.failedAt : cur.failed_at,
    patch.nextRetryAt !== undefined ? patch.nextRetryAt : cur.next_retry_at,
    id
  );
}

export async function listWebhookDeliveriesForEndpoint(
  orgId: string,
  endpointId: string,
  limit: number
): Promise<WebhookDeliveryRow[]> {
  const lim = Math.min(100, Math.max(1, limit));
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("webhook_deliveries")
      .select("*")
      .eq("org_id", orgId)
      .eq("webhook_endpoint_id", endpointId)
      .order("created_at", { ascending: false })
      .limit(lim);
    if (error) throw error;
    return (data ?? []).map((x) => mapDel(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM webhook_deliveries WHERE org_id = ? AND webhook_endpoint_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(orgId, endpointId, lim) as Record<string, unknown>[];
  return rows.map(mapDel);
}

export async function listWebhookDeliveriesDueRetry(nowIso: string, limit: number): Promise<WebhookDeliveryRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("webhook_deliveries")
      .select("*")
      .is("delivered_at", null)
      .is("failed_at", null)
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", nowIso)
      .order("next_retry_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((x) => mapDel(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM webhook_deliveries
       WHERE delivered_at IS NULL AND failed_at IS NULL AND next_retry_at IS NOT NULL AND next_retry_at <= ?
       ORDER BY next_retry_at ASC LIMIT ?`
    )
    .all(nowIso, limit) as Record<string, unknown>[];
  return rows.map(mapDel);
}

export async function getWebhookDeliveryById(id: string): Promise<WebhookDeliveryRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("webhook_deliveries").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapDel(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d.prepare(`SELECT * FROM webhook_deliveries WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapDel(row) : null;
}

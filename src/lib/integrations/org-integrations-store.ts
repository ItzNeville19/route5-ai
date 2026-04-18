import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { encryptSecret } from "@/lib/integrations/token-crypto";
import type {
  GmailCapturedEmailRow,
  GmailWatchRow,
  IntegrationStatus,
  OrgIntegrationMetadata,
  OrgIntegrationRow,
  SlackCapturedMessageRow,
} from "@/lib/integrations/types";

function parseMeta(raw: unknown): OrgIntegrationMetadata {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as OrgIntegrationMetadata;
    } catch {
      return {};
    }
  }
  return (raw as OrgIntegrationMetadata) ?? {};
}

function mapIntegration(r: Record<string, unknown>): OrgIntegrationRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    type: r.type as OrgIntegrationRow["type"],
    accessTokenEncrypted: String(r.access_token_encrypted),
    refreshTokenEncrypted: r.refresh_token_encrypted == null ? null : String(r.refresh_token_encrypted),
    teamId: r.team_id == null ? null : String(r.team_id),
    teamName: r.team_name == null ? null : String(r.team_name),
    botUserId: r.bot_user_id == null ? null : String(r.bot_user_id),
    webhookUrl: r.webhook_url == null ? null : String(r.webhook_url),
    scope: r.scope == null ? null : String(r.scope),
    status: r.status as OrgIntegrationRow["status"],
    connectedAt: r.connected_at == null ? null : String(r.connected_at),
    disconnectedAt: r.disconnected_at == null ? null : String(r.disconnected_at),
    lastUsedAt: r.last_used_at == null ? null : String(r.last_used_at),
    metadata: parseMeta(r.metadata),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapCaptured(r: Record<string, unknown>): SlackCapturedMessageRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    slackTeamId: String(r.slack_team_id),
    slackChannelId: String(r.slack_channel_id),
    slackMessageTs: String(r.slack_message_ts),
    slackUserId: r.slack_user_id == null ? null : String(r.slack_user_id),
    content: String(r.content),
    processed: Boolean(r.processed),
    decisionDetected: Boolean(r.decision_detected),
    commitmentId: r.commitment_id == null ? null : String(r.commitment_id),
    capturedAt: String(r.captured_at),
    confidenceScore:
      r.confidence_score == null || r.confidence_score === ""
        ? null
        : Number(r.confidence_score),
    decisionText: r.decision_text == null ? null : String(r.decision_text),
  };
}

export async function upsertSlackIntegration(params: {
  orgId: string;
  accessToken: string;
  refreshToken: string | null;
  teamId: string;
  teamName: string | null;
  botUserId: string | null;
  scope: string;
  webhookUrl?: string | null;
}): Promise<OrgIntegrationRow> {
  const now = new Date().toISOString();
  const accessEnc = encryptSecret(params.accessToken);
  const refreshEnc = params.refreshToken ? encryptSecret(params.refreshToken) : null;

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: existing, error: exErr } = await supabase
      .from("org_integrations")
      .select("id, metadata")
      .eq("org_id", params.orgId)
      .eq("type", "slack")
      .maybeSingle();
    if (exErr) throw exErr;
    const meta = existing ? parseMeta((existing as { metadata?: unknown }).metadata) : {};
    const row = {
      org_id: params.orgId,
      type: "slack" as const,
      access_token_encrypted: accessEnc,
      refresh_token_encrypted: refreshEnc,
      team_id: params.teamId,
      team_name: params.teamName,
      bot_user_id: params.botUserId,
      webhook_url: params.webhookUrl ?? null,
      scope: params.scope,
      status: "connected" satisfies IntegrationStatus,
      connected_at: now,
      disconnected_at: null,
      last_used_at: now,
      metadata: meta,
      updated_at: now,
    };
    if (existing) {
      const { data, error } = await supabase
        .from("org_integrations")
        .update(row)
        .eq("id", (existing as { id: string }).id)
        .select("*")
        .single();
      if (error) throw error;
      return mapIntegration(data as Record<string, unknown>);
    }
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from("org_integrations")
      .insert({
        id,
        ...row,
        created_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapIntegration(data as Record<string, unknown>);
  }

  const d = getSqliteHandle();
  const existingRow = d
    .prepare(`SELECT id, metadata FROM org_integrations WHERE org_id = ? AND type = 'slack'`)
    .get(params.orgId) as { id: string; metadata: string } | undefined;
  if (existingRow) {
    d.prepare(
      `UPDATE org_integrations SET access_token_encrypted = ?, refresh_token_encrypted = ?, team_id = ?, team_name = ?, bot_user_id = ?,
       webhook_url = ?, scope = ?, status = 'connected', connected_at = ?, disconnected_at = NULL, last_used_at = ?, updated_at = ? WHERE id = ?`
    ).run(
      accessEnc,
      refreshEnc,
      params.teamId,
      params.teamName,
      params.botUserId,
      params.webhookUrl ?? null,
      params.scope,
      now,
      now,
      now,
      existingRow.id
    );
    const row = d.prepare(`SELECT * FROM org_integrations WHERE id = ?`).get(existingRow.id) as Record<
      string,
      unknown
    >;
    return mapIntegration(row);
  }
  const id = crypto.randomUUID();
  d.prepare(
    `INSERT INTO org_integrations (
      id, org_id, type, access_token_encrypted, refresh_token_encrypted, team_id, team_name, bot_user_id,
      webhook_url, scope, status, connected_at, disconnected_at, last_used_at, metadata, created_at, updated_at
    ) VALUES (?, ?, 'slack', ?, ?, ?, ?, ?, ?, ?, 'connected', ?, NULL, ?, '{}', ?, ?)`
  ).run(
    id,
    params.orgId,
    accessEnc,
    refreshEnc,
    params.teamId,
    params.teamName,
    params.botUserId,
    params.webhookUrl ?? null,
    params.scope,
    now,
    now,
    now,
    now
  );
  const row = d.prepare(`SELECT * FROM org_integrations WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapIntegration(row);
}

export async function getSlackIntegrationForOrg(orgId: string): Promise<OrgIntegrationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("type", "slack")
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE org_id = ? AND type = 'slack'`)
    .get(orgId) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function getSlackIntegrationByTeamId(teamId: string): Promise<OrgIntegrationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("type", "slack")
      .eq("team_id", teamId)
      .eq("status", "connected")
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE type = 'slack' AND team_id = ? AND status = 'connected'`)
    .get(teamId) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function updateSlackIntegrationMetadata(
  orgId: string,
  metadata: OrgIntegrationMetadata
): Promise<void> {
  const now = new Date().toISOString();
  const json = JSON.stringify(metadata);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("org_integrations")
      .update({ metadata, updated_at: now })
      .eq("org_id", orgId)
      .eq("type", "slack");
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_integrations SET metadata = ?, updated_at = ? WHERE org_id = ? AND type = 'slack'`
  ).run(json, now, orgId);
}

export async function disconnectSlackIntegration(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("org_integrations")
      .update({
        status: "disconnected",
        disconnected_at: now,
        updated_at: now,
        access_token_encrypted: encryptSecret(""),
        refresh_token_encrypted: null,
      })
      .eq("org_id", orgId)
      .eq("type", "slack");
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_integrations SET status = 'disconnected', disconnected_at = ?, updated_at = ?,
     access_token_encrypted = ?, refresh_token_encrypted = NULL WHERE org_id = ? AND type = 'slack'`
  ).run(now, now, encryptSecret(""), orgId);
}

export async function touchSlackIntegrationUsed(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase
      .from("org_integrations")
      .update({ last_used_at: now, updated_at: now })
      .eq("org_id", orgId)
      .eq("type", "slack");
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`UPDATE org_integrations SET last_used_at = ?, updated_at = ? WHERE org_id = ? AND type = 'slack'`).run(
    now,
    now,
    orgId
  );
}

export async function insertSlackCapturedMessage(params: {
  orgId: string;
  slackTeamId: string;
  slackChannelId: string;
  slackMessageTs: string;
  slackUserId: string | null;
  content: string;
  processed: boolean;
  decisionDetected: boolean;
  commitmentId: string | null;
  confidenceScore: number | null;
  decisionText: string | null;
}): Promise<SlackCapturedMessageRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("slack_captured_messages")
      .insert({
        id,
        org_id: params.orgId,
        slack_team_id: params.slackTeamId,
        slack_channel_id: params.slackChannelId,
        slack_message_ts: params.slackMessageTs,
        slack_user_id: params.slackUserId,
        content: params.content,
        processed: params.processed,
        decision_detected: params.decisionDetected,
        commitment_id: params.commitmentId,
        captured_at: now,
        confidence_score: params.confidenceScore,
        decision_text: params.decisionText,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapCaptured(data as Record<string, unknown>);
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO slack_captured_messages (
      id, org_id, slack_team_id, slack_channel_id, slack_message_ts, slack_user_id, content,
      processed, decision_detected, commitment_id, captured_at, confidence_score, decision_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.slackTeamId,
    params.slackChannelId,
    params.slackMessageTs,
    params.slackUserId,
    params.content,
    params.processed ? 1 : 0,
    params.decisionDetected ? 1 : 0,
    params.commitmentId,
    now,
    params.confidenceScore,
    params.decisionText
  );
  const row = d.prepare(`SELECT * FROM slack_captured_messages WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapCaptured(row);
}

export async function updateSlackCapturedMessage(
  id: string,
  patch: Partial<{
    processed: boolean;
    decisionDetected: boolean;
    commitmentId: string | null;
  }>
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row: Record<string, unknown> = {};
    if (patch.processed !== undefined) row.processed = patch.processed;
    if (patch.decisionDetected !== undefined) row.decision_detected = patch.decisionDetected;
    if (patch.commitmentId !== undefined) row.commitment_id = patch.commitmentId;
    const { error } = await supabase.from("slack_captured_messages").update(row).eq("id", id);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const cur = d.prepare(`SELECT * FROM slack_captured_messages WHERE id = ?`).get(id) as Record<
    string,
    unknown
  > | null;
  if (!cur) return;
  d.prepare(
    `UPDATE slack_captured_messages SET processed = ?, decision_detected = ?, commitment_id = ? WHERE id = ?`
  ).run(
    patch.processed !== undefined ? (patch.processed ? 1 : 0) : cur.processed,
    patch.decisionDetected !== undefined ? (patch.decisionDetected ? 1 : 0) : cur.decision_detected,
    patch.commitmentId !== undefined ? patch.commitmentId : cur.commitment_id,
    id
  );
}

export async function getSlackCapturedById(
  id: string,
  orgId: string
): Promise<SlackCapturedMessageRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("slack_captured_messages")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCaptured(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM slack_captured_messages WHERE id = ? AND org_id = ?`)
    .get(id, orgId) as Record<string, unknown> | undefined;
  return row ? mapCaptured(row) : null;
}

export async function listConnectedSlackIntegrations(): Promise<OrgIntegrationRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("type", "slack")
      .eq("status", "connected");
    if (error) throw error;
    return (data ?? []).map((x) => mapIntegration(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT * FROM org_integrations WHERE type = 'slack' AND status = 'connected'`)
    .all() as Record<string, unknown>[];
  return rows.map(mapIntegration);
}

export async function listSlackReviewQueue(orgId: string, limit = 50): Promise<SlackCapturedMessageRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("slack_captured_messages")
      .select("*")
      .eq("org_id", orgId)
      .eq("processed", false)
      .eq("decision_detected", true)
      .is("commitment_id", null)
      .order("captured_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((x) => mapCaptured(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM slack_captured_messages WHERE org_id = ? AND processed = 0 AND decision_detected = 1 AND commitment_id IS NULL ORDER BY captured_at DESC LIMIT ?`
    )
    .all(orgId, limit) as Record<string, unknown>[];
  return rows.map(mapCaptured);
}

function mapGmailCaptured(r: Record<string, unknown>): GmailCapturedEmailRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    gmailMessageId: String(r.gmail_message_id),
    gmailThreadId: String(r.gmail_thread_id),
    fromEmail: String(r.from_email),
    fromName: r.from_name == null ? null : String(r.from_name),
    subject: String(r.subject ?? ""),
    bodyText: String(r.body_text ?? ""),
    receivedAt: String(r.received_at),
    processed: Boolean(r.processed),
    decisionDetected: Boolean(r.decision_detected),
    commitmentId: r.commitment_id == null ? null : String(r.commitment_id),
    capturedAt: String(r.captured_at),
    confidenceScore:
      r.confidence_score == null || r.confidence_score === ""
        ? null
        : Number(r.confidence_score),
    decisionText: r.decision_text == null ? null : String(r.decision_text),
  };
}

function mapGmailWatch(r: Record<string, unknown>): GmailWatchRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    historyId: String(r.history_id),
    expiration: String(r.expiration),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function upsertGmailIntegration(params: {
  orgId: string;
  accessToken: string;
  refreshToken: string | null;
  emailAddress: string;
  scope: string;
  accessTokenExpiresAtMs: number;
}): Promise<OrgIntegrationRow> {
  const now = new Date().toISOString();
  const accessEnc = encryptSecret(params.accessToken);
  const refreshEnc = params.refreshToken ? encryptSecret(params.refreshToken) : null;
  const meta: OrgIntegrationMetadata = {
    gmail_access_token_expires_at_ms: params.accessTokenExpiresAtMs,
  };

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: existing, error: exErr } = await supabase
      .from("org_integrations")
      .select("id, metadata")
      .eq("org_id", params.orgId)
      .eq("type", "gmail")
      .maybeSingle();
    if (exErr) throw exErr;
    const prevMeta = existing ? parseMeta((existing as { metadata?: unknown }).metadata) : {};
    const merged: OrgIntegrationMetadata = { ...prevMeta, ...meta };
    const row = {
      org_id: params.orgId,
      type: "gmail" as const,
      access_token_encrypted: accessEnc,
      refresh_token_encrypted: refreshEnc,
      team_id: params.emailAddress.toLowerCase(),
      team_name: params.emailAddress,
      bot_user_id: null,
      webhook_url: null,
      scope: params.scope,
      status: "connected" satisfies IntegrationStatus,
      connected_at: now,
      disconnected_at: null,
      last_used_at: now,
      metadata: merged,
      updated_at: now,
    };
    if (existing) {
      const { data, error } = await supabase
        .from("org_integrations")
        .update(row)
        .eq("id", (existing as { id: string }).id)
        .select("*")
        .single();
      if (error) throw error;
      return mapIntegration(data as Record<string, unknown>);
    }
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from("org_integrations")
      .insert({ id, ...row, created_at: now })
      .select("*")
      .single();
    if (error) throw error;
    return mapIntegration(data as Record<string, unknown>);
  }

  const d = getSqliteHandle();
  const existingRow = d
    .prepare(`SELECT id, metadata FROM org_integrations WHERE org_id = ? AND type = 'gmail'`)
    .get(params.orgId) as { id: string; metadata: string } | undefined;
  const prevMeta = existingRow ? parseMeta(existingRow.metadata) : {};
  const mergedJson = JSON.stringify({ ...prevMeta, ...meta });
  if (existingRow) {
    d.prepare(
      `UPDATE org_integrations SET access_token_encrypted = ?, refresh_token_encrypted = ?, team_id = ?, team_name = ?,
       scope = ?, status = 'connected', connected_at = ?, disconnected_at = NULL, last_used_at = ?, metadata = ?, updated_at = ? WHERE id = ?`
    ).run(
      accessEnc,
      refreshEnc,
      params.emailAddress.toLowerCase(),
      params.emailAddress,
      params.scope,
      now,
      now,
      mergedJson,
      now,
      existingRow.id
    );
    const row = d.prepare(`SELECT * FROM org_integrations WHERE id = ?`).get(existingRow.id) as Record<
      string,
      unknown
    >;
    return mapIntegration(row);
  }
  const id = crypto.randomUUID();
  d.prepare(
    `INSERT INTO org_integrations (
      id, org_id, type, access_token_encrypted, refresh_token_encrypted, team_id, team_name, bot_user_id,
      webhook_url, scope, status, connected_at, disconnected_at, last_used_at, metadata, created_at, updated_at
    ) VALUES (?, ?, 'gmail', ?, ?, ?, ?, NULL, NULL, ?, 'connected', ?, NULL, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    accessEnc,
    refreshEnc,
    params.emailAddress.toLowerCase(),
    params.emailAddress,
    params.scope,
    now,
    now,
    mergedJson,
    now,
    now
  );
  const row = d.prepare(`SELECT * FROM org_integrations WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapIntegration(row);
}

export async function updateGmailAccessTokenInPlace(
  orgId: string,
  accessToken: string,
  accessTokenExpiresAtMs: number
): Promise<void> {
  const now = new Date().toISOString();
  const accessEnc = encryptSecret(accessToken);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: row } = await supabase
      .from("org_integrations")
      .select("metadata")
      .eq("org_id", orgId)
      .eq("type", "gmail")
      .maybeSingle();
    const meta = parseMeta((row as { metadata?: unknown } | null)?.metadata);
    meta.gmail_access_token_expires_at_ms = accessTokenExpiresAtMs;
    const { error } = await supabase
      .from("org_integrations")
      .update({
        access_token_encrypted: accessEnc,
        metadata: meta,
        last_used_at: now,
        updated_at: now,
      })
      .eq("org_id", orgId)
      .eq("type", "gmail");
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const cur = d
    .prepare(`SELECT metadata FROM org_integrations WHERE org_id = ? AND type = 'gmail'`)
    .get(orgId) as { metadata: string } | undefined;
  if (!cur) return;
  const meta = parseMeta(cur.metadata);
  meta.gmail_access_token_expires_at_ms = accessTokenExpiresAtMs;
  d.prepare(
    `UPDATE org_integrations SET access_token_encrypted = ?, metadata = ?, last_used_at = ?, updated_at = ? WHERE org_id = ? AND type = 'gmail'`
  ).run(accessEnc, JSON.stringify(meta), now, now, orgId);
}

export async function getGmailIntegrationForOrg(orgId: string): Promise<OrgIntegrationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("type", "gmail")
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE org_id = ? AND type = 'gmail'`)
    .get(orgId) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function getGmailIntegrationByEmail(email: string): Promise<OrgIntegrationRow | null> {
  const key = email.trim().toLowerCase();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("type", "gmail")
      .eq("status", "connected")
      .eq("team_id", key)
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE type = 'gmail' AND status = 'connected' AND lower(team_id) = ?`)
    .get(key) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function disconnectGmailIntegration(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("org_integrations")
      .update({
        status: "disconnected",
        disconnected_at: now,
        updated_at: now,
        access_token_encrypted: encryptSecret(""),
        refresh_token_encrypted: null,
      })
      .eq("org_id", orgId)
      .eq("type", "gmail");
    if (error) throw error;
    await supabase.from("gmail_watch").delete().eq("org_id", orgId);
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_integrations SET status = 'disconnected', disconnected_at = ?, updated_at = ?,
     access_token_encrypted = ?, refresh_token_encrypted = NULL WHERE org_id = ? AND type = 'gmail'`
  ).run(now, now, encryptSecret(""), orgId);
  d.prepare(`DELETE FROM gmail_watch WHERE org_id = ?`).run(orgId);
}

export async function touchGmailIntegrationUsed(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase
      .from("org_integrations")
      .update({ last_used_at: now, updated_at: now })
      .eq("org_id", orgId)
      .eq("type", "gmail");
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`UPDATE org_integrations SET last_used_at = ?, updated_at = ? WHERE org_id = ? AND type = 'gmail'`).run(
    now,
    now,
    orgId
  );
}

export async function upsertGmailWatchRow(params: {
  orgId: string;
  historyId: string;
  expirationIso: string;
}): Promise<GmailWatchRow> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: ex } = await supabase
      .from("gmail_watch")
      .select("id")
      .eq("org_id", params.orgId)
      .maybeSingle();
    if (ex) {
      const { data, error } = await supabase
        .from("gmail_watch")
        .update({
          history_id: params.historyId,
          expiration: params.expirationIso,
          updated_at: now,
        })
        .eq("org_id", params.orgId)
        .select("*")
        .single();
      if (error) throw error;
      return mapGmailWatch(data as Record<string, unknown>);
    }
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from("gmail_watch")
      .insert({
        id,
        org_id: params.orgId,
        history_id: params.historyId,
        expiration: params.expirationIso,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapGmailWatch(data as Record<string, unknown>);
  }
  const d = getSqliteHandle();
  const existing = d
    .prepare(`SELECT id FROM gmail_watch WHERE org_id = ?`)
    .get(params.orgId) as { id: string } | undefined;
  if (existing) {
    d.prepare(
      `UPDATE gmail_watch SET history_id = ?, expiration = ?, updated_at = ? WHERE org_id = ?`
    ).run(params.historyId, params.expirationIso, now, params.orgId);
    const row = d.prepare(`SELECT * FROM gmail_watch WHERE org_id = ?`).get(params.orgId) as Record<
      string,
      unknown
    >;
    return mapGmailWatch(row);
  }
  const id = crypto.randomUUID();
  d.prepare(
    `INSERT INTO gmail_watch (id, org_id, history_id, expiration, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, params.orgId, params.historyId, params.expirationIso, now, now);
  const row = d.prepare(`SELECT * FROM gmail_watch WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapGmailWatch(row);
}

export async function getGmailWatchForOrg(orgId: string): Promise<GmailWatchRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("gmail_watch")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapGmailWatch(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM gmail_watch WHERE org_id = ?`)
    .get(orgId) as Record<string, unknown> | undefined;
  return row ? mapGmailWatch(row) : null;
}

export async function insertGmailCapturedEmail(params: {
  orgId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string;
  receivedAt: string;
  processed: boolean;
  decisionDetected: boolean;
  commitmentId: string | null;
  confidenceScore: number | null;
  decisionText: string | null;
}): Promise<GmailCapturedEmailRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("gmail_captured_emails")
      .insert({
        id,
        org_id: params.orgId,
        gmail_message_id: params.gmailMessageId,
        gmail_thread_id: params.gmailThreadId,
        from_email: params.fromEmail,
        from_name: params.fromName,
        subject: params.subject,
        body_text: params.bodyText,
        received_at: params.receivedAt,
        processed: params.processed,
        decision_detected: params.decisionDetected,
        commitment_id: params.commitmentId,
        captured_at: now,
        confidence_score: params.confidenceScore,
        decision_text: params.decisionText,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapGmailCaptured(data as Record<string, unknown>);
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO gmail_captured_emails (
      id, org_id, gmail_message_id, gmail_thread_id, from_email, from_name, subject, body_text, received_at,
      processed, decision_detected, commitment_id, captured_at, confidence_score, decision_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.gmailMessageId,
    params.gmailThreadId,
    params.fromEmail,
    params.fromName,
    params.subject,
    params.bodyText,
    params.receivedAt,
    params.processed ? 1 : 0,
    params.decisionDetected ? 1 : 0,
    params.commitmentId,
    now,
    params.confidenceScore,
    params.decisionText
  );
  const row = d.prepare(`SELECT * FROM gmail_captured_emails WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapGmailCaptured(row);
}

export async function updateGmailCapturedEmail(
  id: string,
  patch: Partial<{
    processed: boolean;
    decisionDetected: boolean;
    commitmentId: string | null;
  }>
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row: Record<string, unknown> = {};
    if (patch.processed !== undefined) row.processed = patch.processed;
    if (patch.decisionDetected !== undefined) row.decision_detected = patch.decisionDetected;
    if (patch.commitmentId !== undefined) row.commitment_id = patch.commitmentId;
    const { error } = await supabase.from("gmail_captured_emails").update(row).eq("id", id);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const cur = d.prepare(`SELECT * FROM gmail_captured_emails WHERE id = ?`).get(id) as Record<
    string,
    unknown
  > | null;
  if (!cur) return;
  d.prepare(
    `UPDATE gmail_captured_emails SET processed = ?, decision_detected = ?, commitment_id = ? WHERE id = ?`
  ).run(
    patch.processed !== undefined ? (patch.processed ? 1 : 0) : cur.processed,
    patch.decisionDetected !== undefined ? (patch.decisionDetected ? 1 : 0) : cur.decision_detected,
    patch.commitmentId !== undefined ? patch.commitmentId : cur.commitment_id,
    id
  );
}

export async function getGmailCapturedById(
  id: string,
  orgId: string
): Promise<GmailCapturedEmailRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("gmail_captured_emails")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapGmailCaptured(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM gmail_captured_emails WHERE id = ? AND org_id = ?`)
    .get(id, orgId) as Record<string, unknown> | undefined;
  return row ? mapGmailCaptured(row) : null;
}

export async function listGmailReviewQueue(orgId: string, limit = 50): Promise<GmailCapturedEmailRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("gmail_captured_emails")
      .select("*")
      .eq("org_id", orgId)
      .eq("processed", false)
      .eq("decision_detected", true)
      .is("commitment_id", null)
      .order("captured_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((x) => mapGmailCaptured(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM gmail_captured_emails WHERE org_id = ? AND processed = 0 AND decision_detected = 1 AND commitment_id IS NULL ORDER BY captured_at DESC LIMIT ?`
    )
    .all(orgId, limit) as Record<string, unknown>[];
  return rows.map(mapGmailCaptured);
}

export async function listConnectedGmailIntegrations(): Promise<OrgIntegrationRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("type", "gmail")
      .eq("status", "connected");
    if (error) throw error;
    return (data ?? []).map((x) => mapIntegration(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT * FROM org_integrations WHERE type = 'gmail' AND status = 'connected'`)
    .all() as Record<string, unknown>[];
  return rows.map(mapIntegration);
}

export async function countGmailCapturedEmails(orgId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("gmail_captured_emails")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);
    if (error) throw error;
    return count ?? 0;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT COUNT(*) as c FROM gmail_captured_emails WHERE org_id = ?`)
    .get(orgId) as { c: number };
  return row.c;
}

export async function countGmailDecisionsCaptured(orgId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("gmail_captured_emails")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("decision_detected", true);
    if (error) throw error;
    return count ?? 0;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT COUNT(*) as c FROM gmail_captured_emails WHERE org_id = ? AND decision_detected = 1`
    )
    .get(orgId) as { c: number };
  return row.c;
}

export async function listRecentGmailDecisionRows(
  orgId: string,
  limit = 5
): Promise<GmailCapturedEmailRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("gmail_captured_emails")
      .select("*")
      .eq("org_id", orgId)
      .eq("decision_detected", true)
      .order("captured_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((x) => mapGmailCaptured(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM gmail_captured_emails WHERE org_id = ? AND decision_detected = 1 ORDER BY captured_at DESC LIMIT ?`
    )
    .all(orgId, limit) as Record<string, unknown>[];
  return rows.map(mapGmailCaptured);
}

export async function upsertNotionIntegration(params: {
  orgId: string;
  accessToken: string;
  refreshToken: string | null;
  workspaceId: string;
  workspaceName: string | null;
  botId: string | null;
}): Promise<OrgIntegrationRow> {
  const now = new Date().toISOString();
  const accessEnc = encryptSecret(params.accessToken);
  const refreshEnc = params.refreshToken ? encryptSecret(params.refreshToken) : null;

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: existing, error: exErr } = await supabase
      .from("org_integrations")
      .select("id, metadata")
      .eq("org_id", params.orgId)
      .eq("type", "notion")
      .maybeSingle();
    if (exErr) throw exErr;
    const meta = existing ? parseMeta((existing as { metadata?: unknown }).metadata) : {};
    const row = {
      org_id: params.orgId,
      type: "notion" as const,
      access_token_encrypted: accessEnc,
      refresh_token_encrypted: refreshEnc,
      team_id: params.workspaceId,
      team_name: params.workspaceName,
      bot_user_id: params.botId,
      webhook_url: null,
      scope: "notion.workspace",
      status: "connected" satisfies IntegrationStatus,
      connected_at: now,
      disconnected_at: null,
      last_used_at: now,
      metadata: meta,
      updated_at: now,
    };
    if (existing) {
      const { data, error } = await supabase
        .from("org_integrations")
        .update(row)
        .eq("id", (existing as { id: string }).id)
        .select("*")
        .single();
      if (error) throw error;
      return mapIntegration(data as Record<string, unknown>);
    }
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from("org_integrations")
      .insert({ id, ...row, created_at: now })
      .select("*")
      .single();
    if (error) throw error;
    return mapIntegration(data as Record<string, unknown>);
  }

  const d = getSqliteHandle();
  const existingRow = d
    .prepare(`SELECT id, metadata FROM org_integrations WHERE org_id = ? AND type = 'notion'`)
    .get(params.orgId) as { id: string; metadata: string } | undefined;
  const mergedJson = existingRow
    ? JSON.stringify({ ...parseMeta(existingRow.metadata) })
    : "{}";
  if (existingRow) {
    d.prepare(
      `UPDATE org_integrations SET access_token_encrypted = ?, refresh_token_encrypted = ?, team_id = ?, team_name = ?, bot_user_id = ?,
       scope = ?, status = 'connected', connected_at = ?, disconnected_at = NULL, last_used_at = ?, metadata = ?, updated_at = ? WHERE id = ?`
    ).run(
      accessEnc,
      refreshEnc,
      params.workspaceId,
      params.workspaceName,
      params.botId,
      "notion.workspace",
      now,
      now,
      mergedJson,
      now,
      existingRow.id
    );
    const row = d.prepare(`SELECT * FROM org_integrations WHERE id = ?`).get(existingRow.id) as Record<
      string,
      unknown
    >;
    return mapIntegration(row);
  }
  const id = crypto.randomUUID();
  d.prepare(
    `INSERT INTO org_integrations (
      id, org_id, type, access_token_encrypted, refresh_token_encrypted, team_id, team_name, bot_user_id,
      webhook_url, scope, status, connected_at, disconnected_at, last_used_at, metadata, created_at, updated_at
    ) VALUES (?, ?, 'notion', ?, ?, ?, ?, ?, NULL, ?, 'connected', ?, NULL, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    accessEnc,
    refreshEnc,
    params.workspaceId,
    params.workspaceName,
    params.botId,
    "notion.workspace",
    now,
    now,
    mergedJson,
    now,
    now
  );
  const row = d.prepare(`SELECT * FROM org_integrations WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapIntegration(row);
}

export async function getNotionIntegrationForOrg(orgId: string): Promise<OrgIntegrationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("type", "notion")
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE org_id = ? AND type = 'notion'`)
    .get(orgId) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function disconnectNotionIntegration(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("org_integrations")
      .update({
        status: "disconnected",
        disconnected_at: now,
        updated_at: now,
        access_token_encrypted: encryptSecret(""),
        refresh_token_encrypted: null,
      })
      .eq("org_id", orgId)
      .eq("type", "notion");
    if (error) throw error;
    await supabase.from("notion_watched_databases").update({ watching: false }).eq("org_id", orgId);
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_integrations SET status = 'disconnected', disconnected_at = ?, updated_at = ?,
     access_token_encrypted = ?, refresh_token_encrypted = NULL WHERE org_id = ? AND type = 'notion'`
  ).run(now, now, encryptSecret(""), orgId);
  d.prepare(`UPDATE notion_watched_databases SET watching = 0 WHERE org_id = ?`).run(orgId);
}

export async function touchNotionIntegrationUsed(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase
      .from("org_integrations")
      .update({ last_used_at: now, updated_at: now })
      .eq("org_id", orgId)
      .eq("type", "notion");
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`UPDATE org_integrations SET last_used_at = ?, updated_at = ? WHERE org_id = ? AND type = 'notion'`).run(
    now,
    now,
    orgId
  );
}

export async function listConnectedNotionIntegrations(): Promise<OrgIntegrationRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("type", "notion")
      .eq("status", "connected");
    if (error) throw error;
    return (data ?? []).map((x) => mapIntegration(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT * FROM org_integrations WHERE type = 'notion' AND status = 'connected'`)
    .all() as Record<string, unknown>[];
  return rows.map(mapIntegration);
}

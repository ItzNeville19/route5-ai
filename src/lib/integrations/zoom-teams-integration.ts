import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { encryptSecret } from "@/lib/integrations/token-crypto";
import type {
  IntegrationStatus,
  OrgIntegrationMetadata,
  OrgIntegrationRow,
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

export async function upsertZoomIntegration(params: {
  orgId: string;
  accessToken: string;
  refreshToken: string | null;
  accountId: string;
  userLabel: string | null;
  scope: string;
  accessTokenExpiresAtMs: number;
}): Promise<OrgIntegrationRow> {
  const now = new Date().toISOString();
  const accessEnc = encryptSecret(params.accessToken);
  const refreshEnc = params.refreshToken ? encryptSecret(params.refreshToken) : null;
  const meta: OrgIntegrationMetadata = {
    zoom_access_token_expires_at_ms: params.accessTokenExpiresAtMs,
  };

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: existing, error: exErr } = await supabase
      .from("org_integrations")
      .select("id, metadata")
      .eq("org_id", params.orgId)
      .eq("type", "zoom")
      .maybeSingle();
    if (exErr) throw exErr;
    const prevMeta = existing ? parseMeta((existing as { metadata?: unknown }).metadata) : {};
    const merged: OrgIntegrationMetadata = { ...prevMeta, ...meta };
    const row = {
      org_id: params.orgId,
      type: "zoom" as const,
      access_token_encrypted: accessEnc,
      refresh_token_encrypted: refreshEnc,
      team_id: params.accountId,
      team_name: params.userLabel,
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
    .prepare(`SELECT id, metadata FROM org_integrations WHERE org_id = ? AND type = 'zoom'`)
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
      params.accountId,
      params.userLabel,
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
    ) VALUES (?, ?, 'zoom', ?, ?, ?, ?, NULL, NULL, ?, 'connected', ?, NULL, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    accessEnc,
    refreshEnc,
    params.accountId,
    params.userLabel,
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

export async function getZoomIntegrationByAccountId(accountId: string): Promise<OrgIntegrationRow | null> {
  const key = accountId.trim();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("type", "zoom")
      .eq("status", "connected")
      .eq("team_id", key)
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE type = 'zoom' AND status = 'connected' AND team_id = ?`)
    .get(key) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function getZoomIntegrationForOrg(orgId: string): Promise<OrgIntegrationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("type", "zoom")
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE org_id = ? AND type = 'zoom'`)
    .get(orgId) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function disconnectZoomIntegration(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase
      .from("org_integrations")
      .update({
        status: "disconnected",
        disconnected_at: now,
        updated_at: now,
        access_token_encrypted: encryptSecret(""),
        refresh_token_encrypted: null,
      })
      .eq("org_id", orgId)
      .eq("type", "zoom");
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_integrations SET status = 'disconnected', disconnected_at = ?, updated_at = ?,
     access_token_encrypted = ?, refresh_token_encrypted = NULL WHERE org_id = ? AND type = 'zoom'`
  ).run(now, now, encryptSecret(""), orgId);
}

export async function updateZoomAccessTokenInPlace(
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
      .eq("type", "zoom")
      .maybeSingle();
    const meta = parseMeta((row as { metadata?: unknown } | null)?.metadata);
    meta.zoom_access_token_expires_at_ms = accessTokenExpiresAtMs;
    await supabase
      .from("org_integrations")
      .update({
        access_token_encrypted: accessEnc,
        metadata: meta,
        last_used_at: now,
        updated_at: now,
      })
      .eq("org_id", orgId)
      .eq("type", "zoom");
    return;
  }
  const d = getSqliteHandle();
  const cur = d
    .prepare(`SELECT metadata FROM org_integrations WHERE org_id = ? AND type = 'zoom'`)
    .get(orgId) as { metadata: string } | undefined;
  if (!cur) return;
  const meta = parseMeta(cur.metadata);
  meta.zoom_access_token_expires_at_ms = accessTokenExpiresAtMs;
  d.prepare(
    `UPDATE org_integrations SET access_token_encrypted = ?, metadata = ?, last_used_at = ?, updated_at = ? WHERE org_id = ? AND type = 'zoom'`
  ).run(accessEnc, JSON.stringify(meta), now, now, orgId);
}

export async function upsertTeamsIntegration(params: {
  orgId: string;
  accessToken: string;
  refreshToken: string | null;
  tenantId: string;
  userId: string;
  displayName: string | null;
  scope: string;
  accessTokenExpiresAtMs: number;
  metadata?: OrgIntegrationMetadata;
}): Promise<OrgIntegrationRow> {
  const now = new Date().toISOString();
  const accessEnc = encryptSecret(params.accessToken);
  const refreshEnc = params.refreshToken ? encryptSecret(params.refreshToken) : null;
  const meta: OrgIntegrationMetadata = {
    ...params.metadata,
    teams_access_token_expires_at_ms: params.accessTokenExpiresAtMs,
  };

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: existing, error: exErr } = await supabase
      .from("org_integrations")
      .select("id, metadata")
      .eq("org_id", params.orgId)
      .eq("type", "teams")
      .maybeSingle();
    if (exErr) throw exErr;
    const prevMeta = existing ? parseMeta((existing as { metadata?: unknown }).metadata) : {};
    const merged: OrgIntegrationMetadata = { ...prevMeta, ...meta };
    const row = {
      org_id: params.orgId,
      type: "teams" as const,
      access_token_encrypted: accessEnc,
      refresh_token_encrypted: refreshEnc,
      team_id: params.tenantId,
      team_name: params.displayName,
      bot_user_id: params.userId,
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
    .prepare(`SELECT id, metadata FROM org_integrations WHERE org_id = ? AND type = 'teams'`)
    .get(params.orgId) as { id: string; metadata: string } | undefined;
  const prevMeta = existingRow ? parseMeta(existingRow.metadata) : {};
  const mergedJson = JSON.stringify({ ...prevMeta, ...meta });
  if (existingRow) {
    d.prepare(
      `UPDATE org_integrations SET access_token_encrypted = ?, refresh_token_encrypted = ?, team_id = ?, team_name = ?,
       bot_user_id = ?, scope = ?, status = 'connected', connected_at = ?, disconnected_at = NULL, last_used_at = ?, metadata = ?, updated_at = ? WHERE id = ?`
    ).run(
      accessEnc,
      refreshEnc,
      params.tenantId,
      params.displayName,
      params.userId,
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
    ) VALUES (?, ?, 'teams', ?, ?, ?, ?, ?, NULL, ?, 'connected', ?, NULL, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    accessEnc,
    refreshEnc,
    params.tenantId,
    params.displayName,
    params.userId,
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

export async function getTeamsIntegrationForOrg(orgId: string): Promise<OrgIntegrationRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("type", "teams")
      .maybeSingle();
    if (error) throw error;
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_integrations WHERE org_id = ? AND type = 'teams'`)
    .get(orgId) as Record<string, unknown> | undefined;
  return row ? mapIntegration(row) : null;
}

export async function disconnectTeamsIntegration(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase
      .from("org_integrations")
      .update({
        status: "disconnected",
        disconnected_at: now,
        updated_at: now,
        access_token_encrypted: encryptSecret(""),
        refresh_token_encrypted: null,
      })
      .eq("org_id", orgId)
      .eq("type", "teams");
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_integrations SET status = 'disconnected', disconnected_at = ?, updated_at = ?,
     access_token_encrypted = ?, refresh_token_encrypted = NULL WHERE org_id = ? AND type = 'teams'`
  ).run(now, now, encryptSecret(""), orgId);
}

export async function updateTeamsIntegrationMetadata(
  orgId: string,
  patch: OrgIntegrationMetadata
): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: row } = await supabase
      .from("org_integrations")
      .select("metadata")
      .eq("org_id", orgId)
      .eq("type", "teams")
      .maybeSingle();
    const meta = { ...parseMeta((row as { metadata?: unknown } | null)?.metadata), ...patch };
    await supabase
      .from("org_integrations")
      .update({ metadata: meta, updated_at: now })
      .eq("org_id", orgId)
      .eq("type", "teams");
    return;
  }
  const d = getSqliteHandle();
  const cur = d
    .prepare(`SELECT metadata FROM org_integrations WHERE org_id = ? AND type = 'teams'`)
    .get(orgId) as { metadata: string } | undefined;
  if (!cur) return;
  const meta = { ...parseMeta(cur.metadata), ...patch };
  d.prepare(`UPDATE org_integrations SET metadata = ?, updated_at = ? WHERE org_id = ? AND type = 'teams'`).run(
    JSON.stringify(meta),
    now,
    orgId
  );
}

export async function updateTeamsAccessTokenInPlace(
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
      .eq("type", "teams")
      .maybeSingle();
    const meta = parseMeta((row as { metadata?: unknown } | null)?.metadata);
    meta.teams_access_token_expires_at_ms = accessTokenExpiresAtMs;
    await supabase
      .from("org_integrations")
      .update({
        access_token_encrypted: accessEnc,
        metadata: meta,
        last_used_at: now,
        updated_at: now,
      })
      .eq("org_id", orgId)
      .eq("type", "teams");
    return;
  }
  const d = getSqliteHandle();
  const cur = d
    .prepare(`SELECT metadata FROM org_integrations WHERE org_id = ? AND type = 'teams'`)
    .get(orgId) as { metadata: string } | undefined;
  if (!cur) return;
  const meta = parseMeta(cur.metadata);
  meta.teams_access_token_expires_at_ms = accessTokenExpiresAtMs;
  d.prepare(
    `UPDATE org_integrations SET access_token_encrypted = ?, metadata = ?, last_used_at = ?, updated_at = ? WHERE org_id = ? AND type = 'teams'`
  ).run(accessEnc, JSON.stringify(meta), now, now, orgId);
}

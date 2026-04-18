import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import type { ApiScope } from "@/lib/public-api/types";

export type ApiKeyRow = {
  id: string;
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: ApiScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
};

function mapKey(r: Record<string, unknown>): ApiKeyRow {
  const scopesRaw = r.scopes;
  let scopes: ApiScope[] = ["read"];
  if (Array.isArray(scopesRaw)) {
    scopes = scopesRaw.filter((x): x is ApiScope =>
      x === "read" || x === "write" || x === "webhooks"
    );
  } else if (typeof scopesRaw === "string") {
    try {
      const p = JSON.parse(scopesRaw) as unknown;
      if (Array.isArray(p)) {
        scopes = p.filter((x): x is ApiScope =>
          x === "read" || x === "write" || x === "webhooks"
        );
      }
    } catch {
      /* ignore */
    }
  }
  if (scopes.length === 0) scopes = ["read"];
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    name: String(r.name),
    keyHash: String(r.key_hash),
    keyPrefix: String(r.key_prefix),
    scopes,
    lastUsedAt: r.last_used_at == null ? null : String(r.last_used_at),
    expiresAt: r.expires_at == null ? null : String(r.expires_at),
    revoked: r.revoked === true || r.revoked === 1,
    revokedAt: r.revoked_at == null ? null : String(r.revoked_at),
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
  };
}

export async function findApiKeyByHash(keyHash: string): Promise<ApiKeyRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (error) throw error;
    return data ? mapKey(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d.prepare(`SELECT * FROM api_keys WHERE key_hash = ?`).get(keyHash) as
    | Record<string, unknown>
    | undefined;
  return row ? mapKey(row) : null;
}

export async function updateApiKeyLastUsed(id: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase.from("api_keys").update({ last_used_at: now }).eq("id", id);
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`).run(now, id);
}

export async function listApiKeysForOrg(orgId: string): Promise<ApiKeyRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapKey(r as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT * FROM api_keys WHERE org_id = ? ORDER BY created_at DESC`)
    .all(orgId) as Record<string, unknown>[];
  return rows.map(mapKey);
}

export async function insertApiKey(params: {
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: ApiScope[];
  createdBy: string;
  expiresAt?: string | null;
}): Promise<ApiKeyRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const scopesJson = JSON.stringify(params.scopes);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        id,
        org_id: params.orgId,
        name: params.name,
        key_hash: params.keyHash,
        key_prefix: params.keyPrefix,
        scopes: params.scopes,
        last_used_at: null,
        expires_at: params.expiresAt ?? null,
        revoked: false,
        revoked_at: null,
        created_by: params.createdBy,
        created_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapKey(data as Record<string, unknown>);
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO api_keys (id, org_id, name, key_hash, key_prefix, scopes, last_used_at, expires_at, revoked, revoked_at, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, NULL, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.name,
    params.keyHash,
    params.keyPrefix,
    scopesJson,
    params.expiresAt ?? null,
    params.createdBy,
    now
  );
  const row = d.prepare(`SELECT * FROM api_keys WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapKey(row);
}

export async function revokeApiKey(orgId: string, keyId: string): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .update({ revoked: true, revoked_at: now })
      .eq("id", keyId)
      .eq("org_id", orgId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(`UPDATE api_keys SET revoked = 1, revoked_at = ? WHERE id = ? AND org_id = ?`)
    .run(now, keyId, orgId);
  return r.changes > 0;
}

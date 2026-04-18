import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export type NotionCapturedPageRow = {
  id: string;
  orgId: string;
  notionPageId: string;
  notionDatabaseId: string;
  title: string;
  contentText: string;
  pageUrl: string | null;
  createdTime: string | null;
  lastEditedTime: string | null;
  processed: boolean;
  decisionDetected: boolean;
  commitmentId: string | null;
  capturedAt: string;
  confidenceScore: number | null;
  decisionText: string | null;
};

export type NotionWatchedDatabaseRow = {
  id: string;
  orgId: string;
  notionDatabaseId: string;
  databaseName: string | null;
  databaseUrl: string | null;
  watching: boolean;
  lastCursor: string | null;
  lastPolledAt: string | null;
  createdAt: string;
};

function mapCap(r: Record<string, unknown>): NotionCapturedPageRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    notionPageId: String(r.notion_page_id),
    notionDatabaseId: String(r.notion_database_id),
    title: String(r.title ?? ""),
    contentText: String(r.content_text ?? ""),
    pageUrl: r.page_url == null ? null : String(r.page_url),
    createdTime: r.created_time == null ? null : String(r.created_time),
    lastEditedTime: r.last_edited_time == null ? null : String(r.last_edited_time),
    processed: Boolean(r.processed),
    decisionDetected: Boolean(r.decision_detected),
    commitmentId: r.commitment_id == null ? null : String(r.commitment_id),
    capturedAt: String(r.captured_at),
    confidenceScore:
      r.confidence_score == null || r.confidence_score === "" ? null : Number(r.confidence_score),
    decisionText: r.decision_text == null ? null : String(r.decision_text),
  };
}

function mapWatched(r: Record<string, unknown>): NotionWatchedDatabaseRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    notionDatabaseId: String(r.notion_database_id),
    databaseName: r.database_name == null ? null : String(r.database_name),
    databaseUrl: r.database_url == null ? null : String(r.database_url),
    watching: Boolean(r.watching),
    lastCursor: r.last_cursor == null ? null : String(r.last_cursor),
    lastPolledAt: r.last_polled_at == null ? null : String(r.last_polled_at),
    createdAt: String(r.created_at),
  };
}

export async function replaceNotionWatchedDatabasesForOrg(
  orgId: string,
  databases: Array<{ id: string; name: string; url?: string }>
): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase.from("notion_watched_databases").delete().eq("org_id", orgId);
    for (const d of databases) {
      await supabase.from("notion_watched_databases").insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        notion_database_id: d.id,
        database_name: d.name,
        database_url: d.url ?? null,
        watching: true,
        last_cursor: null,
        last_polled_at: null,
        created_at: now,
      });
    }
    return;
  }
  const db = getSqliteHandle();
  db.prepare(`DELETE FROM notion_watched_databases WHERE org_id = ?`).run(orgId);
  for (const d of databases) {
    db.prepare(
      `INSERT INTO notion_watched_databases (
        id, org_id, notion_database_id, database_name, database_url, watching, last_cursor, last_polled_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, NULL, NULL, ?)`
    ).run(crypto.randomUUID(), orgId, d.id, d.name, d.url ?? null, now);
  }
}

export async function listNotionWatchedDatabases(orgId: string): Promise<NotionWatchedDatabaseRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("notion_watched_databases")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((x) => mapWatched(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT * FROM notion_watched_databases WHERE org_id = ? ORDER BY created_at ASC`)
    .all(orgId) as Record<string, unknown>[];
  return rows.map(mapWatched);
}

export async function setNotionDatabaseWatching(
  orgId: string,
  notionDatabaseId: string,
  watching: boolean
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("notion_watched_databases")
      .update({ watching })
      .eq("org_id", orgId)
      .eq("notion_database_id", notionDatabaseId);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `UPDATE notion_watched_databases SET watching = ? WHERE org_id = ? AND notion_database_id = ?`
  ).run(watching ? 1 : 0, orgId, notionDatabaseId);
}

export async function updateNotionWatchedPollState(
  orgId: string,
  notionDatabaseId: string,
  patch: { lastPolledAt?: string; lastCursor?: string | null }
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row: Record<string, unknown> = {};
    if (patch.lastPolledAt !== undefined) row.last_polled_at = patch.lastPolledAt;
    if (patch.lastCursor !== undefined) row.last_cursor = patch.lastCursor;
    const { error } = await supabase
      .from("notion_watched_databases")
      .update(row)
      .eq("org_id", orgId)
      .eq("notion_database_id", notionDatabaseId);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const cur = d
    .prepare(`SELECT * FROM notion_watched_databases WHERE org_id = ? AND notion_database_id = ?`)
    .get(orgId, notionDatabaseId) as Record<string, unknown> | undefined;
  if (!cur) return;
  d.prepare(
    `UPDATE notion_watched_databases SET last_polled_at = ?, last_cursor = ? WHERE org_id = ? AND notion_database_id = ?`
  ).run(
    patch.lastPolledAt !== undefined ? patch.lastPolledAt : cur.last_polled_at,
    patch.lastCursor !== undefined ? patch.lastCursor : cur.last_cursor,
    orgId,
    notionDatabaseId
  );
}

export async function setAllNotionDatabasesUnwatched(orgId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase.from("notion_watched_databases").update({ watching: false }).eq("org_id", orgId);
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`UPDATE notion_watched_databases SET watching = 0 WHERE org_id = ?`).run(orgId);
}

export async function upsertNotionCapturedPage(params: {
  orgId: string;
  notionPageId: string;
  notionDatabaseId: string;
  title: string;
  contentText: string;
  pageUrl: string | null;
  createdTime: string | null;
  lastEditedTime: string | null;
  processed: boolean;
  decisionDetected: boolean;
  commitmentId: string | null;
  confidenceScore: number | null;
  decisionText: string | null;
}): Promise<NotionCapturedPageRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: existing } = await supabase
      .from("notion_captured_pages")
      .select("id")
      .eq("notion_page_id", params.notionPageId)
      .maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from("notion_captured_pages")
        .update({
          title: params.title,
          content_text: params.contentText,
          page_url: params.pageUrl,
          created_time: params.createdTime,
          last_edited_time: params.lastEditedTime,
          processed: params.processed,
          decision_detected: params.decisionDetected,
          commitment_id: params.commitmentId,
          confidence_score: params.confidenceScore,
          decision_text: params.decisionText,
          captured_at: now,
        })
        .eq("notion_page_id", params.notionPageId)
        .select("*")
        .single();
      if (error) throw error;
      return mapCap(data as Record<string, unknown>);
    }
    const { data, error } = await supabase
      .from("notion_captured_pages")
      .insert({
        id,
        org_id: params.orgId,
        notion_page_id: params.notionPageId,
        notion_database_id: params.notionDatabaseId,
        title: params.title,
        content_text: params.contentText,
        page_url: params.pageUrl,
        created_time: params.createdTime,
        last_edited_time: params.lastEditedTime,
        processed: params.processed,
        decision_detected: params.decisionDetected,
        commitment_id: params.commitmentId,
        confidence_score: params.confidenceScore,
        decision_text: params.decisionText,
        captured_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapCap(data as Record<string, unknown>);
  }
  const d = getSqliteHandle();
  const ex = d
    .prepare(`SELECT id FROM notion_captured_pages WHERE notion_page_id = ?`)
    .get(params.notionPageId) as { id: string } | undefined;
  if (ex) {
    d.prepare(
      `UPDATE notion_captured_pages SET
        title = ?, content_text = ?, page_url = ?, created_time = ?, last_edited_time = ?,
        processed = ?, decision_detected = ?, commitment_id = ?, confidence_score = ?, decision_text = ?, captured_at = ?
      WHERE notion_page_id = ?`
    ).run(
      params.title,
      params.contentText,
      params.pageUrl,
      params.createdTime,
      params.lastEditedTime,
      params.processed ? 1 : 0,
      params.decisionDetected ? 1 : 0,
      params.commitmentId,
      params.confidenceScore,
      params.decisionText,
      now,
      params.notionPageId
    );
    const row = d.prepare(`SELECT * FROM notion_captured_pages WHERE notion_page_id = ?`).get(params.notionPageId) as Record<
      string,
      unknown
    >;
    return mapCap(row);
  }
  d.prepare(
    `INSERT INTO notion_captured_pages (
      id, org_id, notion_page_id, notion_database_id, title, content_text, page_url, created_time, last_edited_time,
      processed, decision_detected, commitment_id, confidence_score, decision_text, captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.notionPageId,
    params.notionDatabaseId,
    params.title,
    params.contentText,
    params.pageUrl,
    params.createdTime,
    params.lastEditedTime,
    params.processed ? 1 : 0,
    params.decisionDetected ? 1 : 0,
    params.commitmentId,
    params.confidenceScore,
    params.decisionText,
    now
  );
  const row = d.prepare(`SELECT * FROM notion_captured_pages WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapCap(row);
}

export async function updateNotionCapturedPage(
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
    const { error } = await supabase.from("notion_captured_pages").update(row).eq("id", id);
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const cur = d.prepare(`SELECT * FROM notion_captured_pages WHERE id = ?`).get(id) as Record<
    string,
    unknown
  > | null;
  if (!cur) return;
  d.prepare(
    `UPDATE notion_captured_pages SET processed = ?, decision_detected = ?, commitment_id = ? WHERE id = ?`
  ).run(
    patch.processed !== undefined ? (patch.processed ? 1 : 0) : cur.processed,
    patch.decisionDetected !== undefined ? (patch.decisionDetected ? 1 : 0) : cur.decision_detected,
    patch.commitmentId !== undefined ? patch.commitmentId : cur.commitment_id,
    id
  );
}

export async function getNotionCapturedById(
  id: string,
  orgId: string
): Promise<NotionCapturedPageRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("notion_captured_pages")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCap(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM notion_captured_pages WHERE id = ? AND org_id = ?`)
    .get(id, orgId) as Record<string, unknown> | undefined;
  return row ? mapCap(row) : null;
}

export async function getNotionCapturedByCommitmentId(
  commitmentId: string,
  orgId: string
): Promise<NotionCapturedPageRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("notion_captured_pages")
      .select("*")
      .eq("commitment_id", commitmentId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCap(data as Record<string, unknown>) : null;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM notion_captured_pages WHERE commitment_id = ? AND org_id = ?`)
    .get(commitmentId, orgId) as Record<string, unknown> | undefined;
  return row ? mapCap(row) : null;
}

export async function listNotionReviewQueue(orgId: string, limit = 50): Promise<NotionCapturedPageRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("notion_captured_pages")
      .select("*")
      .eq("org_id", orgId)
      .eq("processed", false)
      .eq("decision_detected", true)
      .is("commitment_id", null)
      .order("captured_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((x) => mapCap(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM notion_captured_pages WHERE org_id = ? AND processed = 0 AND decision_detected = 1 AND commitment_id IS NULL ORDER BY captured_at DESC LIMIT ?`
    )
    .all(orgId, limit) as Record<string, unknown>[];
  return rows.map(mapCap);
}

export async function countNotionCapturedPages(orgId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("notion_captured_pages")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);
    if (error) throw error;
    return count ?? 0;
  }
  const d = getSqliteHandle();
  const row = d.prepare(`SELECT COUNT(*) as c FROM notion_captured_pages WHERE org_id = ?`).get(orgId) as {
    c: number;
  };
  return row.c;
}

export async function countNotionDecisionsCaptured(orgId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("notion_captured_pages")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("decision_detected", true);
    if (error) throw error;
    return count ?? 0;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT COUNT(*) as c FROM notion_captured_pages WHERE org_id = ? AND decision_detected = 1`)
    .get(orgId) as { c: number };
  return row.c;
}

export async function listRecentNotionDecisionRows(
  orgId: string,
  limit = 5
): Promise<NotionCapturedPageRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("notion_captured_pages")
      .select("*")
      .eq("org_id", orgId)
      .eq("decision_detected", true)
      .order("captured_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((x) => mapCap(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM notion_captured_pages WHERE org_id = ? AND decision_detected = 1 ORDER BY captured_at DESC LIMIT ?`
    )
    .all(orgId, limit) as Record<string, unknown>[];
  return rows.map(mapCap);
}

export async function insertNotionCompletedSync(params: {
  orgId: string;
  commitmentId: string;
  notionPageId: string;
  syncStatus: string;
}): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase.from("notion_completed_sync").insert({
      id,
      org_id: params.orgId,
      commitment_id: params.commitmentId,
      notion_page_id: params.notionPageId,
      synced_at: now,
      sync_status: params.syncStatus,
    });
    return;
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO notion_completed_sync (id, org_id, commitment_id, notion_page_id, synced_at, sync_status) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, params.orgId, params.commitmentId, params.notionPageId, now, params.syncStatus);
}

export async function countNotionWatchedActive(orgId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("notion_watched_databases")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("watching", true);
    if (error) throw error;
    return count ?? 0;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT COUNT(*) as c FROM notion_watched_databases WHERE org_id = ? AND watching = 1`)
    .get(orgId) as { c: number };
  return row.c;
}

/** Insert or update a watched database row (e.g. user toggles watch on a newly shared database). */
export async function upsertNotionWatchedDatabaseRow(params: {
  orgId: string;
  notionDatabaseId: string;
  databaseName: string | null;
  databaseUrl: string | null;
  watching: boolean;
}): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: ex } = await supabase
      .from("notion_watched_databases")
      .select("id")
      .eq("org_id", params.orgId)
      .eq("notion_database_id", params.notionDatabaseId)
      .maybeSingle();
    if (ex) {
      await supabase
        .from("notion_watched_databases")
        .update({
          database_name: params.databaseName,
          database_url: params.databaseUrl,
          watching: params.watching,
        })
        .eq("org_id", params.orgId)
        .eq("notion_database_id", params.notionDatabaseId);
      return;
    }
    await supabase.from("notion_watched_databases").insert({
      id: crypto.randomUUID(),
      org_id: params.orgId,
      notion_database_id: params.notionDatabaseId,
      database_name: params.databaseName,
      database_url: params.databaseUrl,
      watching: params.watching,
      last_cursor: null,
      last_polled_at: null,
      created_at: now,
    });
    return;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT id FROM notion_watched_databases WHERE org_id = ? AND notion_database_id = ?`)
    .get(params.orgId, params.notionDatabaseId) as { id: string } | undefined;
  if (row) {
    d.prepare(
      `UPDATE notion_watched_databases SET database_name = ?, database_url = ?, watching = ? WHERE org_id = ? AND notion_database_id = ?`
    ).run(
      params.databaseName,
      params.databaseUrl,
      params.watching ? 1 : 0,
      params.orgId,
      params.notionDatabaseId
    );
  } else {
    d.prepare(
      `INSERT INTO notion_watched_databases (
        id, org_id, notion_database_id, database_name, database_url, watching, last_cursor, last_polled_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)`
    ).run(
      crypto.randomUUID(),
      params.orgId,
      params.notionDatabaseId,
      params.databaseName,
      params.databaseUrl,
      params.watching ? 1 : 0,
      now
    );
  }
}

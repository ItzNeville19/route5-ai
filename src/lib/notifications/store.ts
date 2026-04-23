import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { withSqliteFallback } from "@/lib/supabase/with-sqlite-fallback";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { NOTIFICATION_TYPES, type NotificationPreferenceRow, type NotificationType, type OrgNotificationRow } from "@/lib/notifications/types";

function parseMeta(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw as Record<string, unknown>) ?? {};
}

function mapNotif(r: Record<string, unknown>): OrgNotificationRow {
  const rd = r.read;
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    userId: String(r.user_id),
    type: r.type as NotificationType,
    title: String(r.title),
    body: String(r.body ?? ""),
    metadata: parseMeta(r.metadata),
    read: rd === true || rd === 1,
    readAt: r.read_at == null ? null : String(r.read_at),
    deletedAt: r.deleted_at == null ? null : String(r.deleted_at),
    createdAt: String(r.created_at),
  };
}

function mapPref(r: Record<string, unknown>): NotificationPreferenceRow {
  const ia = r.in_app ?? r.inApp;
  const em = r.email;
  const sl = r.slack;
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    userId: String(r.user_id),
    type: r.type as NotificationType,
    inApp: ia === true || ia === 1,
    email: em === true || em === 1,
    slack: sl === true || sl === 1,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function insertOrgNotification(params: {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const metaJson = JSON.stringify(params.metadata);
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { error } = await supabase.from("org_notifications").insert({
        id,
        org_id: params.orgId,
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata: params.metadata,
        read: false,
        read_at: null,
        deleted_at: null,
        created_at: now,
      });
      if (error) throw error;
      return id;
    },
    () => {
      const d = getSqliteHandle();
      d.prepare(
        `INSERT INTO org_notifications (id, org_id, user_id, type, title, body, metadata, read, read_at, deleted_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)`
      ).run(id, params.orgId, params.userId, params.type, params.title, params.body, metaJson, now);
      return id;
    }
  );
}

export async function listOrgNotificationsForUser(params: {
  userId: string;
  unreadOnly?: boolean;
  limit: number;
  offset: number;
}): Promise<OrgNotificationRow[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      let q = supabase
        .from("org_notifications")
        .select("*")
        .eq("user_id", params.userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);
      if (params.unreadOnly) {
        q = q.eq("read", false);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => mapNotif(r as Record<string, unknown>));
    } catch (e) {
      console.error("[notifications] Supabase list failed, using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const extra = params.unreadOnly ? "AND read = 0" : "";
  const rows = d
    .prepare(
      `SELECT * FROM org_notifications WHERE user_id = ? AND deleted_at IS NULL ${extra}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(params.userId, params.limit, params.offset) as Record<string, unknown>[];
  return rows.map((r) =>
    mapNotif({
      ...r,
      read: Boolean(r.read),
    })
  );
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { count, error } = await supabase
        .from("org_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false)
        .is("deleted_at", null);
      if (error) throw error;
      return count ?? 0;
    } catch (e) {
      console.error("[notifications] Supabase unread count failed, using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT COUNT(*) as c FROM org_notifications WHERE user_id = ? AND read = 0 AND deleted_at IS NULL`
    )
    .get(userId) as { c: number };
  return row?.c ?? 0;
}

/**
 * Prevents sending multiple morning digests when the cron runs often (e.g. every 10 minutes)
 * but the user is still in their local 8:00–8:59 window.
 */
export async function hasMorningDigestForLocalDate(params: {
  orgId: string;
  userId: string;
  localDateKey: string;
}): Promise<boolean> {
  const pattern = `%"morningDigestLocalDate":"${params.localDateKey.replace(/"/g, "")}"%`;
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_notifications")
        .select("id,metadata")
        .eq("org_id", params.orgId)
        .eq("user_id", params.userId)
        .eq("type", "daily_morning_digest")
        .is("deleted_at", null)
        .limit(50);
      if (error) throw error;
      const hit = (data ?? []).find((row) => {
        const m = row.metadata as { morningDigestLocalDate?: string } | null;
        return m?.morningDigestLocalDate === params.localDateKey;
      });
      return Boolean(hit);
    } catch (e) {
      console.error("[notifications] Supabase morning digest check failed, using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT id FROM org_notifications
       WHERE org_id = ? AND user_id = ? AND type = 'daily_morning_digest' AND deleted_at IS NULL
         AND metadata LIKE ?`
    )
    .get(params.orgId, params.userId, pattern) as { id: string } | undefined;
  return Boolean(row?.id);
}

export async function hasRecentNotificationByType(params: {
  userId: string;
  type: NotificationType;
  withinMinutes: number;
}): Promise<boolean> {
  const cutoff = new Date(Date.now() - Math.max(1, params.withinMinutes) * 60_000).toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_notifications")
        .select("id")
        .eq("user_id", params.userId)
        .eq("type", params.type)
        .gte("created_at", cutoff)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.id);
    } catch (e) {
      console.error("[notifications] Supabase recent-type check failed, using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT id FROM org_notifications
       WHERE user_id = ? AND type = ? AND deleted_at IS NULL AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(params.userId, params.type, cutoff) as { id: string } | undefined;
  return Boolean(row?.id);
}

export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_notifications")
        .update({ read: true, read_at: now })
        .eq("id", id)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    } catch (e) {
      console.error("[notifications] Supabase mark read failed, using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(
      `UPDATE org_notifications SET read = 1, read_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    )
    .run(now, id, userId);
  return r.changes > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_notifications")
        .update({ read: true, read_at: now })
        .eq("user_id", userId)
        .eq("read", false)
        .is("deleted_at", null)
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    } catch (e) {
      console.error("[notifications] Supabase mark-all failed, using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(
      `UPDATE org_notifications SET read = 1, read_at = ? WHERE user_id = ? AND read = 0 AND deleted_at IS NULL`
    )
    .run(now, userId);
  return r.changes;
}

export async function softDeleteNotification(id: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_notifications")
      .update({ deleted_at: now })
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(`UPDATE org_notifications SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`)
    .run(now, id, userId);
  return r.changes > 0;
}

export async function softDeleteAllNotifications(userId: string): Promise<number> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_notifications")
        .update({ deleted_at: now })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    } catch (e) {
      console.error("[notifications] Supabase clear-all failed, using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(`UPDATE org_notifications SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL`)
    .run(now, userId);
  return r.changes;
}

export async function listPreferencesForUser(orgId: string, userId: string): Promise<NotificationPreferenceRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r) => mapPref(r as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT * FROM notification_preferences WHERE org_id = ? AND user_id = ?`
    )
    .all(orgId, userId) as Record<string, unknown>[];
  return rows.map((r) => mapPref(r));
}

export async function upsertNotificationPreference(params: {
  orgId: string;
  userId: string;
  type: NotificationType;
  inApp: boolean;
  email: boolean;
  slack: boolean;
}): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        org_id: params.orgId,
        user_id: params.userId,
        type: params.type,
        in_app: params.inApp,
        email: params.email,
        slack: params.slack,
        updated_at: now,
        created_at: now,
      },
      { onConflict: "org_id,user_id,type", ignoreDuplicates: false }
    );
    if (error) throw error;
    return;
  }
  const d = getSqliteHandle();
  const existing = d
    .prepare(
      `SELECT id FROM notification_preferences WHERE org_id = ? AND user_id = ? AND type = ?`
    )
    .get(params.orgId, params.userId, params.type) as { id: string } | undefined;
  if (existing) {
    d.prepare(
      `UPDATE notification_preferences SET in_app = ?, email = ?, slack = ?, updated_at = ? WHERE id = ?`
    ).run(
      params.inApp ? 1 : 0,
      params.email ? 1 : 0,
      params.slack ? 1 : 0,
      now,
      existing.id
    );
  } else {
    const id = crypto.randomUUID();
    d.prepare(
      `INSERT INTO notification_preferences (id, org_id, user_id, type, in_app, email, slack, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.orgId,
      params.userId,
      params.type,
      params.inApp ? 1 : 0,
      params.email ? 1 : 0,
      params.slack ? 1 : 0,
      now,
      now
    );
  }
}

export function defaultPreferencesForOrg(orgId: string, userId: string): NotificationPreferenceRow[] {
  const now = new Date().toISOString();
  return NOTIFICATION_TYPES.map((type) => ({
    id: "",
    orgId,
    userId,
    type,
    inApp: true,
    email:
      !(
        type === "commitment_assigned" ||
        type === "commitment_due_soon" ||
        type === "commitment_overdue" ||
        type === "escalation_fired" ||
        type === "escalation_escalated"
      ),
    slack: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export { NOTIFICATION_TYPES };

import crypto from "node:crypto";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

function uuid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listProjectMemberIds(projectId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId);
    return (data ?? []).map((row) => String((row as { user_id: string }).user_id));
  }
  const db = getSqliteHandle();
  const rows = db
    .prepare(`select user_id from project_members where project_id = ?`)
    .all(projectId) as Array<{ user_id: string }>;
  return rows.map((row) => row.user_id);
}

export async function isProjectMember(userId: string, projectId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle<{ id: string }>();
    return Boolean(data?.id);
  }
  const db = getSqliteHandle();
  const row = db
    .prepare(`select id from project_members where project_id = ? and user_id = ? limit 1`)
    .get(projectId, userId) as { id: string } | undefined;
  return Boolean(row?.id);
}

export async function listMemberProjectIds(userId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);
    return [...new Set((data ?? []).map((row) => String((row as { project_id: string }).project_id)))];
  }
  const db = getSqliteHandle();
  const rows = db
    .prepare(`select project_id from project_members where user_id = ?`)
    .all(userId) as Array<{ project_id: string }>;
  return [...new Set(rows.map((row) => row.project_id))];
}

export async function listProjectMemberIdsByProject(
  projectIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  for (const id of projectIds) map.set(id, []);
  if (projectIds.length === 0) return map;

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("project_members")
      .select("project_id,user_id")
      .in("project_id", projectIds);
    for (const row of data ?? []) {
      const projectId = String((row as { project_id: string }).project_id);
      const userId = String((row as { user_id: string }).user_id);
      const list = map.get(projectId);
      if (list) list.push(userId);
    }
    return map;
  }

  const db = getSqliteHandle();
  const rows = db
    .prepare(
      `select project_id, user_id
       from project_members
       where project_id in (${projectIds.map(() => "?").join(",")})`
    )
    .all(...projectIds) as Array<{ project_id: string; user_id: string }>;
  for (const row of rows) {
    const list = map.get(row.project_id);
    if (list) list.push(row.user_id);
  }
  return map;
}

export async function replaceProjectMembers(
  projectId: string,
  userIds: string[]
): Promise<string[]> {
  const unique = [...new Set(userIds.filter(Boolean).map((id) => id.trim()).filter(Boolean))];
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error: delErr } = await supabase.from("project_members").delete().eq("project_id", projectId);
    if (delErr) throw new Error(`project_members delete: ${delErr.message}`);
    if (unique.length > 0) {
      const now = nowIso();
      const { error: insErr } = await supabase.from("project_members").insert(
        unique.map((userId) => ({
          id: uuid(),
          project_id: projectId,
          user_id: userId,
          role: "member" as const,
          created_at: now,
          updated_at: now,
        }))
      );
      if (insErr) throw new Error(`project_members insert: ${insErr.message}`);
    }
    return unique;
  }
  const db = getSqliteHandle();
  db.prepare(`delete from project_members where project_id = ?`).run(projectId);
  if (unique.length > 0) {
    const stmt = db.prepare(
      `insert into project_members (id, project_id, user_id, created_at, updated_at)
       values (?, ?, ?, ?, ?)`
    );
    const now = nowIso();
    for (const userId of unique) {
      stmt.run(uuid(), projectId, userId, now, now);
    }
  }
  return unique;
}

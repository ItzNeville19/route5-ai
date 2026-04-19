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
    await supabase.from("project_members").delete().eq("project_id", projectId);
    if (unique.length > 0) {
      const now = nowIso();
      await supabase.from("project_members").insert(
        unique.map((userId) => ({
          id: uuid(),
          project_id: projectId,
          user_id: userId,
          created_at: now,
          updated_at: now,
        }))
      );
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

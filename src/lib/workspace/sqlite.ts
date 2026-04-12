/**
 * Embedded workspace DB when Supabase env is not set.
 * For serverless hosts without persistent disk, configure Supabase instead.
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { ActionItemStored } from "@/lib/ai/schema";

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "route5.sqlite");
  const database = new Database(file);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS extractions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      clerk_user_id TEXT NOT NULL,
      raw_input TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      decisions TEXT NOT NULL DEFAULT '[]',
      action_items TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_projects_clerk ON projects(clerk_user_id);
    CREATE INDEX IF NOT EXISTS idx_extractions_project ON extractions(project_id);
    CREATE INDEX IF NOT EXISTS idx_extractions_clerk ON extractions(clerk_user_id);
  `);
  const cols = database
    .prepare(`PRAGMA table_info(projects)`)
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === "icon_emoji")) {
    database.exec(`ALTER TABLE projects ADD COLUMN icon_emoji TEXT`);
  }
  db = database;
  return database;
}

export type SqliteProjectRow = {
  id: string;
  clerk_user_id: string;
  name: string;
  icon_emoji: string | null;
  created_at: string;
  updated_at: string;
};

export function listProjects(userId: string): SqliteProjectRow[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, clerk_user_id, name, icon_emoji, created_at, updated_at
       FROM projects WHERE clerk_user_id = ?
       ORDER BY updated_at DESC`
    )
    .all(userId) as SqliteProjectRow[];
}

export function insertProject(
  userId: string,
  name: string,
  iconEmoji?: string | null
): SqliteProjectRow {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  let icon: string | null = null;
  if (iconEmoji != null && String(iconEmoji).trim()) {
    icon = [...String(iconEmoji).trim()][0] ?? null;
  }
  d.prepare(
    `INSERT INTO projects (id, clerk_user_id, name, icon_emoji, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, name, icon, now, now);
  return {
    id,
    clerk_user_id: userId,
    name,
    icon_emoji: icon,
    created_at: now,
    updated_at: now,
  };
}

export function getProjectById(
  userId: string,
  projectId: string
): SqliteProjectRow | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT id, clerk_user_id, name, icon_emoji, created_at, updated_at FROM projects
       WHERE id = ? AND clerk_user_id = ?`
    )
    .get(projectId, userId) as SqliteProjectRow | undefined;
  return row ?? null;
}

export function updateProjectMetadata(
  userId: string,
  projectId: string,
  fields: { name?: string; iconEmoji?: string | null }
): SqliteProjectRow | null {
  const d = getDb();
  const existing = getProjectById(userId, projectId);
  if (!existing) return null;
  const name = fields.name !== undefined ? fields.name.trim() : existing.name;
  if (!name) throw new Error("INVALID_NAME");
  let iconEmoji: string | null =
    fields.iconEmoji === undefined ? existing.icon_emoji : fields.iconEmoji;
  if (iconEmoji !== null && iconEmoji !== undefined) {
    const t = iconEmoji.trim();
    iconEmoji = t === "" ? null : [...t][0] ?? null;
  }
  const now = new Date().toISOString();
  d.prepare(
    `UPDATE projects SET name = ?, icon_emoji = ?, updated_at = ?
     WHERE id = ? AND clerk_user_id = ?`
  ).run(name, iconEmoji, now, projectId, userId);
  return getProjectById(userId, projectId);
}

/** Deletes every project (and cascaded extractions) for this Clerk user. */
export function deleteAllWorkspaceDataForUser(userId: string): void {
  const d = getDb();
  d.prepare(`DELETE FROM projects WHERE clerk_user_id = ?`).run(userId);
}

/** Deletes the project and cascaded extractions (FK). Returns whether a row was removed. */
export function deleteProject(userId: string, projectId: string): boolean {
  const d = getDb();
  const existing = getProjectById(userId, projectId);
  if (!existing) return false;
  const r = d
    .prepare(`DELETE FROM projects WHERE id = ? AND clerk_user_id = ?`)
    .run(projectId, userId);
  return r.changes > 0;
}

export type SqliteExtractionRow = {
  id: string;
  project_id: string;
  clerk_user_id: string;
  raw_input: string;
  summary: string;
  decisions: string;
  action_items: string;
  created_at: string;
};

export function listExtractionsForProject(
  userId: string,
  projectId: string
): SqliteExtractionRow[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, project_id, clerk_user_id, raw_input, summary, decisions, action_items, created_at
       FROM extractions WHERE project_id = ? AND clerk_user_id = ?
       ORDER BY created_at DESC`
    )
    .all(projectId, userId) as SqliteExtractionRow[];
}

export function insertExtraction(params: {
  projectId: string;
  userId: string;
  rawInput: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItemStored[];
}): { id: string } {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO extractions (id, project_id, clerk_user_id, raw_input, summary, decisions, action_items, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.projectId,
    params.userId,
    params.rawInput,
    params.summary,
    JSON.stringify(params.decisions),
    JSON.stringify(params.actionItems),
    now
  );
  d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(
    now,
    params.projectId
  );
  return { id };
}

export function getExtractionForUser(
  userId: string,
  projectId: string,
  extractionId: string
): SqliteExtractionRow | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT id, project_id, clerk_user_id, raw_input, summary, decisions, action_items, created_at
       FROM extractions WHERE id = ? AND project_id = ? AND clerk_user_id = ?`
    )
    .get(extractionId, projectId, userId) as SqliteExtractionRow | undefined;
  return row ?? null;
}

export function updateExtractionActionItems(
  userId: string,
  projectId: string,
  extractionId: string,
  actionItems: ActionItemStored[]
): void {
  const d = getDb();
  const r = d
    .prepare(
      `UPDATE extractions SET action_items = ?
       WHERE id = ? AND project_id = ? AND clerk_user_id = ?`
    )
    .run(JSON.stringify(actionItems), extractionId, projectId, userId);
  if (r.changes === 0) {
    throw new Error("NOT_FOUND");
  }
  const now = new Date().toISOString();
  d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(
    now,
    projectId
  );
}

export type SummaryResult = {
  projectCount: number;
  extractionCount: number;
  recent: {
    id: string;
    project_id: string;
    summary: string;
    created_at: string;
    projectName: string;
    action_items: string;
  }[];
};

export function getWorkspaceSummary(userId: string): SummaryResult {
  const d = getDb();
  const projectCount =
    (
      d
        .prepare(
          `SELECT COUNT(*) as c FROM projects WHERE clerk_user_id = ?`
        )
        .get(userId) as { c: number }
    ).c ?? 0;
  const extractionCount =
    (
      d
        .prepare(
          `SELECT COUNT(*) as c FROM extractions WHERE clerk_user_id = ?`
        )
        .get(userId) as { c: number }
    ).c ?? 0;
  const recentRows = d
    .prepare(
      `SELECT id, project_id, summary, created_at, action_items FROM extractions
       WHERE clerk_user_id = ?
       ORDER BY created_at DESC LIMIT 6`
    )
    .all(userId) as {
    id: string;
    project_id: string;
    summary: string;
    created_at: string;
    action_items: string;
  }[];

  const projectIds = [...new Set(recentRows.map((r) => r.project_id))];
  const nameByProject = new Map<string, string>();
  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => "?").join(",");
    const names = d
      .prepare(
        `SELECT id, name FROM projects WHERE clerk_user_id = ? AND id IN (${placeholders})`
      )
      .all(userId, ...projectIds) as { id: string; name: string }[];
    for (const n of names) {
      nameByProject.set(n.id, n.name);
    }
  }

  return {
    projectCount,
    extractionCount,
    recent: recentRows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      summary: r.summary,
      created_at: r.created_at,
      projectName: nameByProject.get(r.project_id) ?? "Project",
      action_items: r.action_items,
    })),
  };
}

/** All extractions for analytics (capped). */
/** Extractions at or after `sinceIso` (UTC), inclusive — for monthly plan caps. */
export function countExtractionsSince(userId: string, sinceIso: string): number {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT COUNT(*) as c FROM extractions WHERE clerk_user_id = ? AND created_at >= ?`
    )
    .get(userId, sinceIso) as { c: number };
  return row?.c ?? 0;
}

export function listExtractionsForExecutionMetrics(
  userId: string,
  limit = 8000
): {
  project_id: string;
  decisions: string;
  action_items: string;
  created_at: string;
}[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT project_id, decisions, action_items, created_at FROM extractions
       WHERE clerk_user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as {
    project_id: string;
    decisions: string;
    action_items: string;
    created_at: string;
  }[];
}

function decisionsJsonLength(raw: string): number {
  try {
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? j.length : 0;
  } catch {
    return 0;
  }
}

/** Timestamps + decision counts for activity / chart APIs (last 14 days window). */
export function listExtractionActivityPointsSince(
  userId: string,
  sinceIso: string
): { created_at: string; decision_count: number }[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT created_at, decisions FROM extractions WHERE clerk_user_id = ? AND created_at >= ?`
    )
    .all(userId, sinceIso) as { created_at: string; decisions: string }[];
  return rows.map((r) => ({
    created_at: r.created_at,
    decision_count: decisionsJsonLength(r.decisions ?? "[]"),
  }));
}

export function listProjectPalette(userId: string): { id: string; name: string }[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, name FROM projects WHERE clerk_user_id = ?
       ORDER BY updated_at DESC LIMIT 40`
    )
    .all(userId) as { id: string; name: string }[];
}

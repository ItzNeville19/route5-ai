import type { ActionItemStored } from "@/lib/ai/schema";
import type { Extraction, Project } from "@/lib/types";
import type { RecentExtractionRow } from "@/lib/workspace-summary";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import * as sqlite from "@/lib/workspace/sqlite";

export type StorageBackend = "supabase" | "sqlite";

export function getStorageBackend(): StorageBackend {
  return isSupabaseConfigured() ? "supabase" : "sqlite";
}

function parseActionItems(raw: unknown): ActionItemStored[] {
  if (!Array.isArray(raw)) return [];
  const out: ActionItemStored[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const text = typeof o.text === "string" ? o.text : "";
    if (!id || !text) continue;
    const owner =
      o.owner === null || o.owner === undefined
        ? null
        : typeof o.owner === "string"
          ? o.owner
          : null;
    out.push({
      id,
      text,
      owner,
      completed: Boolean(o.completed),
    });
  }
  return out;
}

function parseActionItemsFromDbJson(text: string): ActionItemStored[] {
  try {
    const raw = JSON.parse(text) as unknown;
    return parseActionItems(raw);
  } catch {
    return [];
  }
}

function parseDecisions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((d): d is string => typeof d === "string");
}

function rowToProject(row: {
  id: string;
  clerk_user_id: string;
  name: string;
  icon_emoji?: string | null;
  created_at: string;
  updated_at: string;
}): Project {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    name: row.name,
    iconEmoji: row.icon_emoji ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjectsForUser(userId: string): Promise<Project[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .eq("clerk_user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToProject);
  }
  return sqlite.listProjects(userId).map(rowToProject);
}

export async function createProjectForUser(
  userId: string,
  name: string
): Promise<Project> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ clerk_user_id: userId, name })
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .single();
    if (error) throw error;
    return rowToProject(data);
  }
  const row = sqlite.insertProject(userId, name);
  return rowToProject(row);
}

export async function getProjectDetailForUser(
  userId: string,
  projectId: string
): Promise<{ project: Project; extractions: Extraction[] } | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .eq("id", projectId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!project || project.clerk_user_id !== userId) return null;

    const { data: rows, error: eErr } = await supabase
      .from("extractions")
      .select(
        "id, project_id, clerk_user_id, raw_input, summary, decisions, action_items, created_at"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (eErr) throw eErr;

    const extractions: Extraction[] = (rows ?? []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      clerkUserId: row.clerk_user_id,
      rawInput: row.raw_input,
      summary: row.summary,
      decisions: parseDecisions(row.decisions),
      actionItems: parseActionItems(row.action_items),
      createdAt: row.created_at,
    }));

    return { project: rowToProject(project), extractions };
  }

  const project = sqlite.getProjectById(userId, projectId);
  if (!project) return null;
  const rows = sqlite.listExtractionsForProject(userId, projectId);
  const extractions: Extraction[] = rows.map((row) => {
    let decisions: string[] = [];
    try {
      decisions = parseDecisions(JSON.parse(row.decisions || "[]"));
    } catch {
      decisions = [];
    }
    return {
      id: row.id,
      projectId: row.project_id,
      clerkUserId: row.clerk_user_id,
      rawInput: row.raw_input,
      summary: row.summary,
      decisions,
      actionItems: parseActionItemsFromDbJson(row.action_items),
      createdAt: row.created_at,
    };
  });

  return { project: rowToProject(project), extractions };
}

export async function verifyProjectOwned(
  userId: string,
  projectId: string
): Promise<{ id: string } | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, clerk_user_id")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.clerk_user_id !== userId) return null;
    return { id: data.id };
  }
  const p = sqlite.getProjectById(userId, projectId);
  return p ? { id: p.id } : null;
}

export async function updateProjectForUser(
  userId: string,
  projectId: string,
  patch: { name?: string; iconEmoji?: string | null }
): Promise<Project | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: row, error: gErr } = await supabase
      .from("projects")
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .eq("id", projectId)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!row || row.clerk_user_id !== userId) return null;

    const nextName =
      patch.name !== undefined ? patch.name.trim() : row.name;
    if (!nextName) throw new Error("INVALID_NAME");

    let nextIcon: string | null =
      patch.iconEmoji === undefined ? row.icon_emoji ?? null : patch.iconEmoji;
    if (nextIcon !== null && nextIcon !== undefined) {
      const t = nextIcon.trim();
      nextIcon = t === "" ? null : [...t][0] ?? null;
    }

    const { data: updated, error: uErr } = await supabase
      .from("projects")
      .update({
        name: nextName,
        icon_emoji: nextIcon,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("clerk_user_id", userId)
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .maybeSingle();
    if (uErr) throw uErr;
    return updated ? rowToProject(updated) : null;
  }

  try {
    const row = sqlite.updateProjectMetadata(userId, projectId, patch);
    return row ? rowToProject(row) : null;
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_NAME") throw e;
    throw e;
  }
}

export async function insertExtractionRow(params: {
  userId: string;
  projectId: string;
  rawInput: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItemStored[];
}): Promise<{ id: string }> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("extractions")
      .insert({
        project_id: params.projectId,
        clerk_user_id: params.userId,
        raw_input: params.rawInput,
        summary: params.summary,
        decisions: params.decisions,
        action_items: params.actionItems,
      })
      .select("id")
      .single();
    if (error) throw error;
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.projectId);
    return { id: data.id };
  }
  return sqlite.insertExtraction({
    projectId: params.projectId,
    userId: params.userId,
    rawInput: params.rawInput,
    summary: params.summary,
    decisions: params.decisions,
    actionItems: params.actionItems,
  });
}

export async function updateExtractionActions(params: {
  userId: string;
  projectId: string;
  extractionId: string;
  actionItems: ActionItemStored[];
}): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, clerk_user_id")
      .eq("id", params.projectId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!project || project.clerk_user_id !== params.userId) {
      throw new Error("NOT_FOUND");
    }

    const { data: extraction, error: gErr } = await supabase
      .from("extractions")
      .select("id, project_id, clerk_user_id")
      .eq("id", params.extractionId)
      .eq("project_id", params.projectId)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!extraction || extraction.clerk_user_id !== params.userId) {
      throw new Error("NOT_FOUND");
    }

    const { data: updated, error: uErr } = await supabase
      .from("extractions")
      .update({ action_items: params.actionItems })
      .eq("id", params.extractionId)
      .eq("project_id", params.projectId)
      .select("id")
      .maybeSingle();
    if (uErr) throw uErr;
    if (!updated) throw new Error("NOT_FOUND");
    return;
  }

  sqlite.updateExtractionActionItems(
    params.userId,
    params.projectId,
    params.extractionId,
    params.actionItems
  );
}

export async function getWorkspaceSummaryForUser(
  userId: string
): Promise<{
  projectCount: number;
  extractionCount: number;
  recent: RecentExtractionRow[];
}> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count: projectCount, error: pcErr } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("clerk_user_id", userId);
    if (pcErr) throw pcErr;

    const { count: extractionCount, error: ecErr } = await supabase
      .from("extractions")
      .select("*", { count: "exact", head: true })
      .eq("clerk_user_id", userId);
    if (ecErr) throw ecErr;

    const { data: recentRows, error: rErr } = await supabase
      .from("extractions")
      .select("id, project_id, summary, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    if (rErr) throw rErr;

    const rows = recentRows ?? [];
    const projectIds = [...new Set(rows.map((r) => r.project_id))];
    let nameByProject = new Map<string, string>();
    if (projectIds.length > 0) {
      const { data: projRows, error: pErr } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds)
        .eq("clerk_user_id", userId);
      if (!pErr && projRows) {
        nameByProject = new Map(projRows.map((p) => [p.id, p.name]));
      }
    }

    const recent: RecentExtractionRow[] = rows.map((r) => {
      const summary = typeof r.summary === "string" ? r.summary : "";
      const snippet =
        summary.length > 120 ? `${summary.slice(0, 117).trim()}…` : summary;
      return {
        id: r.id,
        projectId: r.project_id,
        projectName: nameByProject.get(r.project_id) ?? "Project",
        summarySnippet: snippet || "(No summary yet)",
        createdAt: r.created_at,
      };
    });

    return {
      projectCount: projectCount ?? 0,
      extractionCount: extractionCount ?? 0,
      recent,
    };
  }

  const s = sqlite.getWorkspaceSummary(userId);
  const recent: RecentExtractionRow[] = s.recent.map((r) => {
    const summary = typeof r.summary === "string" ? r.summary : "";
    const snippet =
      summary.length > 120 ? `${summary.slice(0, 117).trim()}…` : summary;
    return {
      id: r.id,
      projectId: r.project_id,
      projectName: r.projectName,
      summarySnippet: snippet || "(No summary yet)",
      createdAt: r.created_at,
    };
  });

  return {
    projectCount: s.projectCount,
    extractionCount: s.extractionCount,
    recent,
  };
}

/** Deep copy one extraction as a new row (fresh action item ids, checkboxes cleared). */
export async function duplicateExtractionForUser(
  userId: string,
  projectId: string,
  extractionId: string
): Promise<{ id: string } | null> {
  const detail = await getProjectDetailForUser(userId, projectId);
  if (!detail) return null;
  const source = detail.extractions.find((e) => e.id === extractionId);
  if (!source) return null;
  const actionItems = source.actionItems.map((a) => ({
    ...a,
    id: crypto.randomUUID(),
    completed: false,
  }));
  const base = source.summary.trim();
  const summary = base ? `${base} (copy)` : "(copy)";
  return insertExtractionRow({
    userId,
    projectId,
    rawInput: source.rawInput,
    summary,
    decisions: [...source.decisions],
    actionItems,
  });
}

export async function listPaletteProjectsForUser(
  userId: string
): Promise<{ id: string; name: string }[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("clerk_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []) as { id: string; name: string }[];
  }
  return sqlite.listProjectPalette(userId);
}

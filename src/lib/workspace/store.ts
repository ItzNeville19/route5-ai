import type { ActionItemStored } from "@/lib/ai/schema";
import type { Extraction, Project } from "@/lib/types";
import type { RecentExtractionRow } from "@/lib/workspace-summary";
import {
  computeActivityStats,
  computeAllActivitySeries,
  computeExecutionMetrics,
  emptyExecutionMetrics,
  type ActivitySeriesByRange,
  type ExecutionExtractionInput,
  type ExtractionActivityPoint,
  type WorkspaceActivityStats,
  type WorkspaceExecutionMetrics,
} from "@/lib/workspace-activity-stats";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import * as sqlite from "@/lib/workspace/sqlite";

export type StorageBackend = "supabase" | "sqlite";

function decisionCountFromDb(decisions: unknown): number {
  if (Array.isArray(decisions)) return decisions.length;
  if (typeof decisions === "string") {
    try {
      const j = JSON.parse(decisions) as unknown;
      return Array.isArray(j) ? j.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

export function getStorageBackend(): StorageBackend {
  return isSupabaseConfigured() ? "supabase" : "sqlite";
}

/** Start of current UTC calendar month (for monthly extraction caps). */
export function utcMonthStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(1);
  return d.toISOString();
}

/** Count extractions created this UTC month — used for plan limits. */
export async function countExtractionsThisUtcMonthForUser(userId: string): Promise<number> {
  const since = utcMonthStartIso();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("extractions")
      .select("*", { count: "exact", head: true })
      .eq("clerk_user_id", userId)
      .gte("created_at", since);
    if (error) throw error;
    return count ?? 0;
  }
  return sqlite.countExtractionsSince(userId, since);
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
  name: string,
  opts?: { iconEmoji?: string | null }
): Promise<Project> {
  let icon: string | null = null;
  if (opts?.iconEmoji != null && String(opts.iconEmoji).trim()) {
    icon = [...String(opts.iconEmoji).trim()][0] ?? null;
  }
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ clerk_user_id: userId, name, icon_emoji: icon })
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .single();
    if (error) throw error;
    return rowToProject(data);
  }
  const row = sqlite.insertProject(userId, name, icon);
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

export async function deleteProjectForUser(
  userId: string,
  projectId: string
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: row, error: gErr } = await supabase
      .from("projects")
      .select("id, clerk_user_id")
      .eq("id", projectId)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!row || row.clerk_user_id !== userId) return false;

    const { error: dErr } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("clerk_user_id", userId);
    if (dErr) throw dErr;
    return true;
  }
  return sqlite.deleteProject(userId, projectId);
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

function recentRowSnippet(summary: string): string {
  const s = typeof summary === "string" ? summary : "";
  return s.length > 120 ? `${s.slice(0, 117).trim()}…` : s;
}

function normalizeActionItemsForMetrics(raw: unknown): { completed: boolean }[] {
  if (typeof raw === "string") {
    return parseActionItemsFromDbJson(raw).map((a) => ({
      completed: Boolean(a.completed),
    }));
  }
  return parseActionItems(raw).map((a) => ({ completed: Boolean(a.completed) }));
}

function buildExecutionInputsFromRows(
  rows: {
    project_id: string;
    decisions: unknown;
    action_items: unknown;
    created_at: string;
  }[],
  nameByProject: Map<string, string>
): ExecutionExtractionInput[] {
  const out: ExecutionExtractionInput[] = [];
  for (const r of rows) {
    let decisions: string[] = [];
    if (Array.isArray(r.decisions)) {
      decisions = r.decisions.filter((d): d is string => typeof d === "string");
    } else if (typeof r.decisions === "string") {
      try {
        const parsed = JSON.parse(r.decisions) as unknown;
        decisions = parseDecisions(parsed);
      } catch {
        decisions = [];
      }
    }
    const actionItems = normalizeActionItemsForMetrics(r.action_items);
    out.push({
      projectId: r.project_id,
      projectName: nameByProject.get(r.project_id) ?? "Project",
      createdAt: r.created_at,
      decisions,
      actionItems,
    });
  }
  return out;
}

export async function getWorkspaceSummaryForUser(
  userId: string
): Promise<{
  projectCount: number;
  extractionCount: number;
  recent: RecentExtractionRow[];
  activity: WorkspaceActivityStats;
  activitySeries: ActivitySeriesByRange;
  execution: WorkspaceExecutionMetrics;
}> {
  /** Long window for “all time” monthly buckets; heatmap still uses only the last 14d of these points. */
  const chartPointsSince = new Date(Date.now() - 20 * 365 * 86400000).toISOString();

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
      .select("id, project_id, summary, created_at, action_items")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    if (rErr) throw rErr;

    const rows = recentRows ?? [];
    let nameByProject = new Map<string, string>();
    const { data: allProjRows, error: allPErr } = await supabase
      .from("projects")
      .select("id, name")
      .eq("clerk_user_id", userId);
    if (!allPErr && allProjRows) {
      nameByProject = new Map(allProjRows.map((p) => [p.id, p.name]));
    }

    const recent: RecentExtractionRow[] = rows.map((r) => {
      const summary = typeof r.summary === "string" ? r.summary : "";
      const snippet = recentRowSnippet(summary) || "(No summary yet)";
      const openActionsCount = normalizeActionItemsForMetrics(r.action_items).filter(
        (a) => !a.completed
      ).length;
      return {
        id: r.id,
        projectId: r.project_id,
        projectName: nameByProject.get(r.project_id) ?? "Project",
        summarySnippet: snippet,
        createdAt: r.created_at,
        openActionsCount,
      };
    });

    const { data: tsData, error: tsErr } = await supabase
      .from("extractions")
      .select("created_at, decisions")
      .eq("clerk_user_id", userId)
      .gte("created_at", chartPointsSince)
      .limit(100000);
    const activityPoints: ExtractionActivityPoint[] =
      !tsErr && tsData
        ? (tsData as { created_at: string; decisions: unknown }[]).map((r) => ({
            createdAt: r.created_at,
            decisionCount: decisionCountFromDb(r.decisions),
          }))
        : [];
    const activity = computeActivityStats(activityPoints);
    const activitySeries = computeAllActivitySeries(activityPoints);

    const { data: execRows, error: exErr } = await supabase
      .from("extractions")
      .select("project_id, decisions, action_items, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8000);
    const execution =
      exErr || !execRows
        ? emptyExecutionMetrics()
        : computeExecutionMetrics(
            buildExecutionInputsFromRows(
              execRows as {
                project_id: string;
                decisions: unknown;
                action_items: unknown;
                created_at: string;
              }[],
              nameByProject
            )
          );

    return {
      projectCount: projectCount ?? 0,
      extractionCount: extractionCount ?? 0,
      recent,
      activity,
      activitySeries,
      execution,
    };
  }

  const s = sqlite.getWorkspaceSummary(userId);
  const recent: RecentExtractionRow[] = s.recent.map((r) => {
    const summary = typeof r.summary === "string" ? r.summary : "";
    const snippet = recentRowSnippet(summary) || "(No summary yet)";
    const openActionsCount = parseActionItemsFromDbJson(r.action_items ?? "[]").filter(
      (a) => !a.completed
    ).length;
    return {
      id: r.id,
      projectId: r.project_id,
      projectName: r.projectName,
      summarySnippet: snippet,
      createdAt: r.created_at,
      openActionsCount,
    };
  });

  const rawPoints = sqlite.listExtractionActivityPointsSince(userId, chartPointsSince);
  const activityPoints: ExtractionActivityPoint[] = rawPoints.map((r) => ({
    createdAt: r.created_at,
    decisionCount: r.decision_count,
  }));
  const activity = computeActivityStats(activityPoints);
  const activitySeries = computeAllActivitySeries(activityPoints);

  const projects = sqlite.listProjects(userId);
  const nameByProject = new Map(projects.map((p) => [p.id, p.name]));
  const execRows = sqlite.listExtractionsForExecutionMetrics(userId);
  const execution = computeExecutionMetrics(
    buildExecutionInputsFromRows(execRows, nameByProject)
  );

  return {
    projectCount: s.projectCount,
    extractionCount: s.extractionCount,
    recent,
    activity,
    activitySeries,
    execution,
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

/** Removes all Route5 workspace rows for this user (before Clerk account deletion). */
export async function deleteAllWorkspaceDataForUser(userId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error: exErr } = await supabase
      .from("extractions")
      .delete()
      .eq("clerk_user_id", userId);
    if (exErr) throw exErr;
    const { error: prErr } = await supabase
      .from("projects")
      .delete()
      .eq("clerk_user_id", userId);
    if (prErr) throw prErr;
    return;
  }
  sqlite.deleteAllWorkspaceDataForUser(userId);
}

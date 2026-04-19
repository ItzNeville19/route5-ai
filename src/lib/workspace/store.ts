import type { ActionItemStored } from "@/lib/ai/schema";
import { parseOpenQuestionsField, parseOpenQuestionsFromDbJson } from "@/lib/ai/schema";
import type { Extraction, Project } from "@/lib/types";
import type { OpenActionRef, RecentExtractionRow } from "@/lib/workspace-summary";
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
import { nanoid } from "nanoid";
import type {
  Commitment,
  CommitmentActivityEntry,
  CommitmentPriority,
  CommitmentStatus,
  ExecutionOverview,
} from "@/lib/commitment-types";
import { mapRowToCommitment, serializeActivityLog } from "@/lib/commitment-map";
import { buildExecutionOverview } from "@/lib/execution-overview";
import type { ExtractedCommitmentDraft } from "@/lib/extract-commitments";
import { notifyEscalationEmail } from "@/lib/notify-resend";
import { sendNotification } from "@/lib/notifications/service";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { isProjectMember, listMemberProjectIds } from "@/lib/workspace/project-members";
import * as sqlite from "@/lib/workspace/sqlite";
import { appBaseUrl } from "@/lib/app-base-url";
import type { ProjectBackupItem } from "@/lib/workspace/project-backup";

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

const OPEN_ACTION_QUEUE_MAX = 25;

function actionItemsFromRow(action_items: unknown): ActionItemStored[] {
  if (typeof action_items === "string") {
    return parseActionItemsFromDbJson(action_items);
  }
  return parseActionItems(action_items);
}

/**
 * Walk extractions from oldest to newest; emit incomplete actions until `maxItems`.
 * Surfaces stale commitments so users clear backlog before adding new capture.
 */
function buildOpenActionQueue(
  extractions: { id: string; project_id: string; created_at: string; action_items: unknown }[],
  nameByProject: Map<string, string>,
  maxItems: number
): OpenActionRef[] {
  const sorted = [...extractions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const out: OpenActionRef[] = [];
  for (const r of sorted) {
    const items = actionItemsFromRow(r.action_items).filter((a) => !a.completed);
    for (const a of items) {
      if (out.length >= maxItems) return out;
      out.push({
        actionId: a.id,
        text: a.text,
        projectId: r.project_id,
        projectName: nameByProject.get(r.project_id) ?? "Project",
        extractionId: r.id,
        extractionCreatedAt: r.created_at,
      });
    }
  }
  return out;
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
  await ensureOrganizationForClerkUser(userId);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: ownedRows, error } = await supabase
      .from("projects")
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .eq("clerk_user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const memberProjectIds = await listMemberProjectIds(userId);
    const ownedIds = new Set((ownedRows ?? []).map((row) => String((row as { id: string }).id)));
    const sharedIds = memberProjectIds.filter((id) => !ownedIds.has(id));
    let sharedRows: Array<{
      id: string;
      clerk_user_id: string;
      name: string;
      icon_emoji?: string | null;
      created_at: string;
      updated_at: string;
    }> = [];
    if (sharedIds.length > 0) {
      const { data: rows } = await supabase
        .from("projects")
        .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
        .in("id", sharedIds);
      sharedRows = (rows ?? []) as typeof sharedRows;
    }
    const merged = [...(ownedRows ?? []), ...sharedRows];
    return merged
      .map(rowToProject)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  const owned = sqlite.listProjects(userId).map(rowToProject);
  const memberProjectIds = await listMemberProjectIds(userId);
  const extra: Project[] = [];
  for (const projectId of memberProjectIds) {
    if (owned.some((project) => project.id === projectId)) continue;
    const row = sqlite.getProjectById(sqlite.getProjectOwnerClerkId(projectId) ?? "", projectId);
    if (row) extra.push(rowToProject(row));
  }
  return [...owned, ...extra].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function createProjectForUser(
  userId: string,
  name: string,
  opts?: { iconEmoji?: string | null }
): Promise<Project> {
  if (process.env.VERCEL === "1" && !isSupabaseConfigured()) {
    throw new Error(
      "Supabase is required in production: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role) on Vercel. Ephemeral SQLite cannot persist projects across requests."
    );
  }
  const orgId = await ensureOrganizationForClerkUser(userId);
  let icon: string | null = null;
  if (opts?.iconEmoji != null && String(opts.iconEmoji).trim()) {
    icon = [...String(opts.iconEmoji).trim()][0] ?? null;
  }
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ clerk_user_id: userId, name, icon_emoji: icon, org_id: orgId })
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .single();
    if (error) throw error;
    return rowToProject(data);
  }
  const row = sqlite.insertProject(userId, name, icon, orgId);
  return rowToProject(row);
}

/**
 * Restores projects from a backup snapshot while preserving IDs where possible.
 * Used when a read unexpectedly returns empty but we still have a trusted user backup.
 */
export async function restoreProjectsFromBackupForUser(
  userId: string,
  backup: ProjectBackupItem[]
): Promise<Project[]> {
  if (backup.length === 0) return listProjectsForUser(userId);
  const orgId = await ensureOrganizationForClerkUser(userId);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const rows = backup.map((item) => ({
      id: item.id,
      clerk_user_id: userId,
      name: item.name,
      icon_emoji: item.iconEmoji ?? null,
      org_id: orgId,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));
    const { error } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
    if (error) throw error;
    return listProjectsForUser(userId);
  }

  for (const item of backup) {
    const existing = sqlite.getProjectById(userId, item.id);
    if (!existing) {
      try {
        sqlite.insertProject(userId, item.name, item.iconEmoji ?? null, orgId);
      } catch {
        /* best-effort restore in sqlite fallback */
      }
    }
  }
  return listProjectsForUser(userId);
}

export async function getProjectDetailForUser(
  userId: string,
  projectId: string
): Promise<{ project: Project; extractions: Extraction[] } | null> {
  const access = await verifyProjectOwned(userId, projectId);
  if (!access) return null;
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, clerk_user_id, name, icon_emoji, created_at, updated_at")
      .eq("id", projectId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!project) return null;

    const { data: rows, error: eErr } = await supabase
      .from("extractions")
      .select(
        "id, project_id, clerk_user_id, raw_input, summary, problem, solution, open_questions, decisions, action_items, created_at"
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
      problem: typeof row.problem === "string" ? row.problem : "",
      solution: typeof row.solution === "string" ? row.solution : "",
      openQuestions: parseOpenQuestionsField(row.open_questions),
      decisions: parseDecisions(row.decisions),
      actionItems: parseActionItems(row.action_items),
      createdAt: row.created_at,
    }));

    return { project: rowToProject(project), extractions };
  }

  const ownerId = sqlite.getProjectOwnerClerkId(projectId) ?? userId;
  const project = sqlite.getProjectById(ownerId, projectId);
  if (!project) return null;
  const rows = sqlite.listExtractionsForProject(ownerId, projectId);
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
      problem: row.problem ?? "",
      solution: row.solution ?? "",
      openQuestions: parseOpenQuestionsFromDbJson(row.open_questions ?? "[]"),
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
    if (!data) return null;
    if (data.clerk_user_id !== userId) {
      const member = await isProjectMember(userId, projectId);
      if (!member) return null;
    }
    return { id: data.id };
  }
  const p = sqlite.getProjectById(userId, projectId);
  if (p) return { id: p.id };
  const member = await isProjectMember(userId, projectId);
  if (!member) return null;
  const ownerId = sqlite.getProjectOwnerClerkId(projectId);
  if (!ownerId) return null;
  const ownedRow = sqlite.getProjectById(ownerId, projectId);
  if (!ownedRow) return null;
  return { id: ownedRow.id };
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
  problem: string;
  solution: string;
  openQuestions: string[];
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
        problem: params.problem,
        solution: params.solution,
        open_questions: params.openQuestions,
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
    problem: params.problem,
    solution: params.solution,
    openQuestions: params.openQuestions,
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
  const access = await verifyProjectOwned(params.userId, params.projectId);
  if (!access) throw new Error("NOT_FOUND");
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: extraction, error: gErr } = await supabase
      .from("extractions")
      .select("id, project_id")
      .eq("id", params.extractionId)
      .eq("project_id", params.projectId)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!extraction) {
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

  const ownerId = sqlite.getProjectOwnerClerkId(params.projectId) ?? params.userId;
  sqlite.updateExtractionActionItems(
    ownerId,
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
  userId: string,
  projectId?: string
): Promise<{
  projectCount: number;
  extractionCount: number;
  recent: RecentExtractionRow[];
  openActions: OpenActionRef[];
  activity: WorkspaceActivityStats;
  activitySeries: ActivitySeriesByRange;
  execution: WorkspaceExecutionMetrics;
}> {
  await ensureOrganizationForClerkUser(userId);
  /** Long window for “all time” monthly buckets; heatmap still uses only the last 14d of these points. */
  const chartPointsSince = new Date(Date.now() - 20 * 365 * 86400000).toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count: projectCount, error: pcErr } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("clerk_user_id", userId)
      .eq(projectId ? "id" : "clerk_user_id", projectId ?? userId);
    if (pcErr) throw pcErr;

    let extractionCountQuery = supabase
      .from("extractions")
      .select("*", { count: "exact", head: true })
      .eq("clerk_user_id", userId);
    if (projectId) extractionCountQuery = extractionCountQuery.eq("project_id", projectId);
    const { count: extractionCount, error: ecErr } = await extractionCountQuery;
    if (ecErr) throw ecErr;

    let recentQuery = supabase
      .from("extractions")
      .select("id, project_id, summary, created_at, action_items")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    if (projectId) recentQuery = recentQuery.eq("project_id", projectId);
    const { data: recentRows, error: rErr } = await recentQuery;
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

    let queueQuery = supabase
      .from("extractions")
      .select("id, project_id, created_at, action_items")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: true })
      .limit(400);
    if (projectId) queueQuery = queueQuery.eq("project_id", projectId);
    const { data: queueRows, error: qErr } = await queueQuery;
    const openActions =
      qErr || !queueRows
        ? []
        : buildOpenActionQueue(
            queueRows as {
              id: string;
              project_id: string;
              created_at: string;
              action_items: unknown;
            }[],
            nameByProject,
            OPEN_ACTION_QUEUE_MAX
          );

    let tsQuery = supabase
      .from("extractions")
      .select("created_at, decisions")
      .eq("clerk_user_id", userId)
      .gte("created_at", chartPointsSince)
      .limit(100000);
    if (projectId) tsQuery = tsQuery.eq("project_id", projectId);
    const { data: tsData, error: tsErr } = await tsQuery;
    const activityPoints: ExtractionActivityPoint[] =
      !tsErr && tsData
        ? (tsData as { created_at: string; decisions: unknown }[]).map((r) => ({
            createdAt: r.created_at,
            decisionCount: decisionCountFromDb(r.decisions),
          }))
        : [];
    const activity = computeActivityStats(activityPoints);
    const activitySeries = computeAllActivitySeries(activityPoints);

    let execQuery = supabase
      .from("extractions")
      .select("project_id, decisions, action_items, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8000);
    if (projectId) execQuery = execQuery.eq("project_id", projectId);
    const { data: execRows, error: exErr } = await execQuery;
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
      openActions,
      activity,
      activitySeries,
      execution,
    };
  }

  const s = sqlite.getWorkspaceSummary(userId);
  const recentFiltered = projectId ? s.recent.filter((r) => r.project_id === projectId) : s.recent;
  const recent: RecentExtractionRow[] = recentFiltered.map((r) => {
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
  const queueRows = sqlite
    .listExtractionsForOpenActionQueue(userId)
    .filter((r) => (projectId ? r.project_id === projectId : true));
  const openActions = buildOpenActionQueue(
    queueRows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      created_at: r.created_at,
      action_items: r.action_items,
    })),
    nameByProject,
    OPEN_ACTION_QUEUE_MAX
  );
  const execRows = sqlite
    .listExtractionsForExecutionMetrics(userId)
    .filter((r) => (projectId ? r.project_id === projectId : true));
  const execution = computeExecutionMetrics(
    buildExecutionInputsFromRows(execRows, nameByProject)
  );

  return {
    projectCount: projectId ? projects.filter((p) => p.id === projectId).length : s.projectCount,
    extractionCount: projectId ? execRows.length : s.extractionCount,
    recent,
    openActions,
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
    problem: source.problem?.trim() ? `${source.problem.trim()} (copy)` : "",
    solution: source.solution?.trim() ? `${source.solution.trim()} (copy)` : "",
    openQuestions: [...(source.openQuestions ?? [])],
    decisions: [...source.decisions],
    actionItems,
  });
}

export async function listPaletteProjectsForUser(
  userId: string
): Promise<{ id: string; name: string }[]> {
  const projects = await listProjectsForUser(userId);
  return projects.slice(0, 40).map((project) => ({ id: project.id, name: project.name }));
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
    const { error: coErr } = await supabase
      .from("commitments")
      .delete()
      .eq("clerk_user_id", userId);
    if (coErr) throw coErr;
    const { error: prErr } = await supabase
      .from("projects")
      .delete()
      .eq("clerk_user_id", userId);
    if (prErr) throw prErr;
    const { error: orgErr } = await supabase
      .from("organizations")
      .delete()
      .eq("clerk_user_id", userId);
    if (orgErr) throw orgErr;
    return;
  }
  sqlite.deleteAllWorkspaceDataForUser(userId);
}

function initialActivityLog(userId: string, body: string): CommitmentActivityEntry[] {
  return [
    {
      id: nanoid(),
      at: new Date().toISOString(),
      kind: "system",
      body,
      actorUserId: userId,
    },
  ];
}

export async function listCommitmentsForProject(
  userId: string,
  projectId: string
): Promise<Commitment[]> {
  const owned = await verifyProjectOwned(userId, projectId);
  if (!owned) return [];
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("last_updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapRowToCommitment(r as Parameters<typeof mapRowToCommitment>[0]));
  }
  const ownerId = sqlite.getProjectOwnerClerkId(projectId) ?? userId;
  return sqlite.listCommitmentsForProject(ownerId, projectId).map(mapRowToCommitment);
}

export async function getCommitmentForUser(
  userId: string,
  projectId: string,
  commitmentId: string
): Promise<Commitment | null> {
  const access = await verifyProjectOwned(userId, projectId);
  if (!access) return null;
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .eq("id", commitmentId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToCommitment(data as Parameters<typeof mapRowToCommitment>[0]) : null;
  }
  const ownerId = sqlite.getProjectOwnerClerkId(projectId) ?? userId;
  const row = sqlite.getCommitmentRow(ownerId, projectId, commitmentId);
  return row ? mapRowToCommitment(row) : null;
}

export async function insertCommitmentsFromDrafts(
  userId: string,
  projectId: string,
  drafts: ExtractedCommitmentDraft[],
  opts?: { assignOwnerUserId?: string | null; createdLogBody?: string }
): Promise<Commitment[]> {
  const owned = await verifyProjectOwned(userId, projectId);
  if (!owned) throw new Error("NOT_FOUND");
  const out: Commitment[] = [];
  const logBody = opts?.createdLogBody?.trim() || "Created from captured input";
  for (const d of drafts) {
    const fromDraft =
      d.ownerUserId !== undefined && d.ownerUserId !== null && String(d.ownerUserId).trim() !== ""
        ? String(d.ownerUserId).trim()
        : null;
    const assign =
      fromDraft !== null ? fromDraft : opts?.assignOwnerUserId !== undefined ? opts.assignOwnerUserId ?? null : null;
    const ownerDisplayName = d.ownerName?.trim() || null;
    const log = initialActivityLog(userId, logBody);
    const logJson = serializeActivityLog(log);
    if (isSupabaseConfigured()) {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("commitments")
        .insert({
          project_id: projectId,
          clerk_user_id: userId,
          title: d.title.slice(0, 2000),
          description: d.description ?? null,
          owner_user_id: assign,
          owner_display_name: ownerDisplayName,
          source: d.source,
          source_reference: d.sourceReference ?? "",
          status: "active",
          priority: d.priority,
          due_date: d.dueDate ?? null,
          activity_log: log,
          archived_at: null,
        })
        .select("*")
        .single();
      if (error) throw error;
      if (data) out.push(mapRowToCommitment(data as Parameters<typeof mapRowToCommitment>[0]));
    } else {
      const { id } = sqlite.insertCommitmentRow({
        projectId,
        userId,
        title: d.title.slice(0, 2000),
        description: d.description ?? null,
        ownerUserId: assign,
        ownerDisplayName: ownerDisplayName,
        source: d.source,
        sourceReference: d.sourceReference ?? "",
        status: "active",
        priority: d.priority,
        dueDate: d.dueDate ?? null,
        activityLogJson: logJson,
      });
      const row = sqlite.getCommitmentRow(userId, projectId, id);
      if (row) out.push(mapRowToCommitment(row));
    }
  }
  return out;
}

/**
 * Creates one commitment per extraction action item so Overview / Desk execution intel
 * reflects the same work as structured runs (system of record).
 */
export async function insertCommitmentsFromExtractionActionItems(
  userId: string,
  projectId: string,
  extractionId: string,
  actionItems: ActionItemStored[]
): Promise<Commitment[]> {
  if (actionItems.length === 0) return [];
  const drafts: ExtractedCommitmentDraft[] = actionItems.map((a) => ({
    title: a.text.trim().slice(0, 2000) || "Action item",
    description: null,
    ownerName: a.owner?.trim() || null,
    source: "meeting",
    sourceReference: `extraction:${extractionId}`,
    priority: "medium",
    dueDate: null,
  }));
  return insertCommitmentsFromDrafts(userId, projectId, drafts, {
    createdLogBody: "Created from extraction run",
  });
}

export async function updateCommitmentForUser(
  userId: string,
  projectId: string,
  commitmentId: string,
  patch: {
    title?: string;
    description?: string | null;
    ownerUserId?: string | null;
    ownerDisplayName?: string | null;
    status?: CommitmentStatus;
    priority?: CommitmentPriority;
    dueDate?: string | null;
    note?: string;
  }
): Promise<Commitment | null> {
  const existing = await getCommitmentForUser(userId, projectId, commitmentId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const newEntries: CommitmentActivityEntry[] = [];
  if (patch.note?.trim()) {
    newEntries.push({
      id: nanoid(),
      at: now,
      kind: "note",
      body: patch.note.trim(),
      actorUserId: userId,
    });
  }
  if (patch.status !== undefined && patch.status !== existing.status) {
    newEntries.push({
      id: nanoid(),
      at: now,
      kind: "status",
      body: `Status → ${patch.status}`,
      actorUserId: userId,
    });
  }
  if (patch.ownerUserId !== undefined && patch.ownerUserId !== existing.ownerUserId) {
    newEntries.push({
      id: nanoid(),
      at: now,
      kind: "owner",
      body: "Owner updated",
      actorUserId: userId,
    });
  }
  const log = [...newEntries, ...existing.activityLog];

  const nextStatus = patch.status ?? existing.status;
  const nextTitle = patch.title ?? existing.title;
  const nextDesc = patch.description !== undefined ? patch.description : existing.description;
  const nextOwner = patch.ownerUserId !== undefined ? patch.ownerUserId : existing.ownerUserId;
  const nextOwnerName =
    patch.ownerDisplayName !== undefined ? patch.ownerDisplayName : existing.ownerDisplayName;
  const nextPri = patch.priority ?? existing.priority;
  const nextDue = patch.dueDate !== undefined ? patch.dueDate : existing.dueDate;

  const logJson = serializeActivityLog(log);

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitments")
      .update({
        title: nextTitle,
        description: nextDesc,
        owner_user_id: nextOwner,
        owner_display_name: nextOwnerName,
        status: nextStatus,
        priority: nextPri,
        due_date: nextDue,
        last_updated_at: now,
        activity_log: log,
      })
      .eq("id", commitmentId)
      .eq("project_id", projectId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToCommitment(data as Parameters<typeof mapRowToCommitment>[0]) : null;
  }

  const ownerId = sqlite.getProjectOwnerClerkId(projectId) ?? userId;
  const row = sqlite.updateCommitmentRow(ownerId, projectId, commitmentId, {
    title: nextTitle,
    description: nextDesc,
    ownerUserId: nextOwner,
    ownerDisplayName: nextOwnerName,
    status: nextStatus,
    priority: nextPri,
    dueDate: nextDue,
    activityLogJson: logJson,
  });
  return row ? mapRowToCommitment(row) : null;
}

/**
 * Soft-archive: commitment remains in the database for audit; removed from active Desk/Overview lists.
 * Prefer this over hard delete except for full account purge.
 */
export async function archiveCommitmentForUser(
  userId: string,
  projectId: string,
  commitmentId: string
): Promise<boolean> {
  const existing = await getCommitmentForUser(userId, projectId, commitmentId);
  if (!existing || existing.archivedAt) return false;

  const now = new Date().toISOString();
  const log: CommitmentActivityEntry[] = [
    {
      id: nanoid(),
      at: now,
      kind: "system",
      body: "Archived from active lists — full history remains available in the audit log.",
      actorUserId: userId,
    },
    ...existing.activityLog,
  ];
  const logPayload = serializeActivityLog(log);

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitments")
      .update({
        archived_at: now,
        last_updated_at: now,
        activity_log: log,
      })
      .eq("id", commitmentId)
      .eq("project_id", projectId)
      .is("archived_at", null)
      .select("id");
    if (error) throw error;
    const ok = (data?.length ?? 0) > 0;
    if (ok) {
      await supabase
        .from("projects")
        .update({ updated_at: now })
        .eq("id", projectId);
    }
    return ok;
  }

  const ownerId = sqlite.getProjectOwnerClerkId(projectId) ?? userId;
  return sqlite.archiveCommitmentRow(ownerId, projectId, commitmentId, logPayload);
}

/** @deprecated Use archiveCommitmentForUser — retained name for internal account wipe only. */
export async function deleteCommitmentForUser(
  userId: string,
  projectId: string,
  commitmentId: string
): Promise<boolean> {
  return archiveCommitmentForUser(userId, projectId, commitmentId);
}

const RECONCILE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function parseRowStatus(raw: string): CommitmentStatus {
  if (raw === "active" || raw === "at_risk" || raw === "overdue" || raw === "completed") {
    return raw;
  }
  return "active";
}

async function recordEscalationForReconcile(
  userId: string,
  projectId: string,
  commitmentId: string,
  title: string,
  previousStatus: CommitmentStatus,
  newStatus: CommitmentStatus
): Promise<void> {
  if (newStatus !== "overdue" && newStatus !== "at_risk") return;
  const reason =
    newStatus === "overdue" ? "DUE_DATE_PASSED" : "STALE_INACTIVITY_OR_FLAGGED";
  const n = new Date().toISOString();
  const deskLink = `${appBaseUrl()}/desk?projectId=${encodeURIComponent(projectId)}`;

  let notifiedAt: string | null = null;
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    await sendNotification({
      orgId,
      userId,
      type: newStatus === "overdue" ? "commitment_overdue" : "escalation_fired",
      title:
        newStatus === "overdue"
          ? `Overdue: ${title.slice(0, 80)}`
          : `At risk: ${title.slice(0, 80)}`,
      body:
        newStatus === "overdue"
          ? `This desk commitment is past its deadline. Reason: ${reason}.`
          : `This desk commitment needs attention. Reason: ${reason}.`,
      metadata: {
        projectId,
        commitmentId,
        reason,
        previousStatus,
        newStatus,
        link: deskLink,
      },
    });
    notifiedAt = n;
  } catch {
    const email = await notifyEscalationEmail({
      commitmentTitle: title,
      projectId,
      commitmentId,
      reason,
      newStatus,
    });
    notifiedAt = email.sent ? n : null;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { error } = await supabase.from("escalation_events").insert({
        clerk_user_id: userId,
        project_id: projectId,
        commitment_id: commitmentId,
        reason,
        previous_status: previousStatus,
        new_status: newStatus,
        notified_at: notifiedAt,
      });
      if (error) throw error;
    } catch {
      /* Table missing until migration 003 applied — reconciliation still updates commitments. */
    }
    return;
  }
  sqlite.insertEscalationEvent({
    userId,
    projectId,
    commitmentId,
    reason,
    previousStatus,
    newStatus,
    notifiedAt,
  });
}

/**
 * Persists escalation: overdue from due date, at_risk from inactivity (7d).
 * Records escalation_events + optional email when status tightens.
 */
export async function reconcileCommitmentStatesForUser(userId: string): Promise<void> {
  const now = Date.now();

  const considerRow = async (
    projectId: string,
    commitmentId: string,
    title: string,
    dueRaw: string | null,
    lastUpdated: string,
    storedRaw: string
  ) => {
    const stored = parseRowStatus(storedRaw);
    if (stored === "completed") return;

    let desired: CommitmentStatus | null = null;
    if (dueRaw) {
      const t = new Date(dueRaw).getTime();
      if (!Number.isNaN(t) && t < now && stored !== "overdue") {
        desired = "overdue";
      }
    }
    if (!desired) {
      const idle = now - new Date(lastUpdated).getTime();
      if (idle > RECONCILE_STALE_MS && stored === "active") {
        desired = "at_risk";
      }
    }
    if (!desired || desired === stored) return;

    const updated = await updateCommitmentForUser(userId, projectId, commitmentId, {
      status: desired,
    });
    if (!updated) return;
    await recordEscalationForReconcile(
      userId,
      projectId,
      commitmentId,
      title,
      stored,
      desired
    );
  };

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: rows, error } = await supabase
      .from("commitments")
      .select("id, project_id, title, due_date, last_updated_at, status")
      .eq("clerk_user_id", userId)
      .is("archived_at", null)
      .neq("status", "completed");
    if (error) throw error;
    for (const r of rows ?? []) {
      const row = r as {
        id: string;
        project_id: string;
        title: string;
        due_date: string | null;
        last_updated_at: string;
        status: string;
      };
      await considerRow(
        row.project_id,
        row.id,
        row.title,
        row.due_date,
        row.last_updated_at,
        row.status
      );
    }
    return;
  }

  for (const row of sqlite.listCommitmentsForUser(userId)) {
    if (row.status === "completed") continue;
    await considerRow(
      row.project_id,
      row.id,
      row.title,
      row.due_date,
      row.last_updated_at,
      row.status
    );
  }
}

export async function getProjectOwnerClerkId(projectId: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("clerk_user_id")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    return (data as { clerk_user_id: string } | null)?.clerk_user_id ?? null;
  }
  return sqlite.getProjectOwnerClerkId(projectId);
}

export async function getExecutionOverviewForUser(
  userId: string,
  projectId?: string
): Promise<ExecutionOverview> {
  await reconcileCommitmentStatesForUser(userId);

  const projects = await listProjectsForUser(userId);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .eq("clerk_user_id", userId)
      .eq(projectId ? "project_id" : "clerk_user_id", projectId ?? userId)
      .is("archived_at", null)
      .order("last_updated_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    const commitments = (data ?? []).map((r) =>
      mapRowToCommitment(r as Parameters<typeof mapRowToCommitment>[0])
    );
    return buildExecutionOverview(commitments, nameById);
  }

  const rows = sqlite
    .listCommitmentsForUser(userId)
    .filter((r) => (projectId ? r.project_id === projectId : true));
  const commitments = rows.map(mapRowToCommitment);
  return buildExecutionOverview(commitments, nameById);
}

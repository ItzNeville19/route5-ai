import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type {
  OrgCommitmentAttachment,
  OrgCommitmentComment,
  OrgCommitmentDependency,
  OrgCommitmentDetail,
  OrgCommitmentHistoryEntry,
  OrgCommitmentListSort,
  OrgCommitmentPriority,
  OrgCommitmentRow,
  OrgCommitmentStatus,
} from "@/lib/org-commitment-types";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { computeAutomaticOrgCommitmentStatus } from "@/lib/org-commitments/status";
import { sendNotification } from "@/lib/notifications/service";
import { appBaseUrl } from "@/lib/app-base-url";

function workspaceCommitmentLink(commitmentId: string): string {
  return `${appBaseUrl()}/workspace/commitments?id=${encodeURIComponent(commitmentId)}`;
}

function formatDeadlineLine(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const BUCKET = "commitment-attachments";
const PRIORITY_RANK: Record<OrgCommitmentPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function mapRow(r: Record<string, unknown>): OrgCommitmentRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    title: String(r.title),
    description: r.description == null ? null : String(r.description),
    ownerId: String(r.owner_id),
    projectId: r.project_id == null ? null : String(r.project_id),
    deadline: String(r.deadline),
    priority: r.priority as OrgCommitmentPriority,
    status: r.status as OrgCommitmentStatus,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    completedAt: r.completed_at == null ? null : String(r.completed_at),
    lastActivityAt: String(r.last_activity_at),
    deletedAt: r.deleted_at == null ? null : String(r.deleted_at),
  };
}

async function resolveOrgId(userId: string): Promise<string> {
  return ensureOrganizationForClerkUser(userId);
}

/** Distinct commitment owner user ids in this workspace (Clerk user ids). */
export async function listDistinctOwnerIdsForOrg(userId: string): Promise<string[]> {
  const orgId = await resolveOrgId(userId);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .select("owner_id")
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (error) throw error;
    const set = new Set<string>();
    for (const row of data ?? []) {
      const id = String((row as { owner_id: string }).owner_id ?? "").trim();
      if (id) set.add(id);
    }
    return [...set];
  }
  const d = getSqliteHandle();
  const raw = d
    .prepare(
      `SELECT DISTINCT owner_id FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL AND trim(owner_id) != ''`
    )
    .all(orgId) as { owner_id: string }[];
  return raw.map((r) => String(r.owner_id));
}

export async function listOrgCommitments(
  userId: string,
  opts: {
    status?: string;
    priority?: string;
    owner?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string;
    sort?: OrgCommitmentListSort;
    order?: "asc" | "desc";
  }
): Promise<OrgCommitmentRow[]> {
  const orgId = await resolveOrgId(userId);
  const sort = opts.sort ?? "deadline";
  const order = opts.order ?? "asc";

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let q = supabase
      .from("org_commitments")
      .select("*")
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.priority) q = q.eq("priority", opts.priority);
    if (opts.owner) q = q.eq("owner_id", opts.owner);
    if (opts.dateFrom) q = q.gte("deadline", opts.dateFrom);
    if (opts.dateTo) q = q.lte("deadline", opts.dateTo);
    /* Keyword filter applied in-memory after fetch (reliable across PostgREST or() quirks). */
    if (sort === "priority") {
      q = q.order("priority", { ascending: order === "asc" });
    } else {
      const col =
        sort === "created_at"
          ? "created_at"
          : sort === "updated_at"
            ? "updated_at"
            : sort === "status"
              ? "status"
              : sort === "owner_id"
                ? "owner_id"
                : "deadline";
      q = q.order(col, { ascending: order === "asc" });
    }
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map((x) => mapRow(x as Record<string, unknown>));
    if (opts.q?.trim()) {
      const low = opts.q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(low) ||
          (r.description?.toLowerCase().includes(low) ?? false)
      );
    }
    if (sort === "priority") {
      const mul = order === "asc" ? 1 : -1;
      rows = [...rows].sort(
        (a, b) => (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * mul
      );
    }
    return rows;
  }

  const d = getSqliteHandle();
  const parts: string[] = ["org_id = ?", "deleted_at IS NULL"];
  const params: unknown[] = [orgId];
  if (opts.status) {
    parts.push("status = ?");
    params.push(opts.status);
  }
  if (opts.priority) {
    parts.push("priority = ?");
    params.push(opts.priority);
  }
  if (opts.owner) {
    parts.push("owner_id = ?");
    params.push(opts.owner);
  }
  if (opts.dateFrom) {
    parts.push("deadline >= ?");
    params.push(opts.dateFrom);
  }
  if (opts.dateTo) {
    parts.push("deadline <= ?");
    params.push(opts.dateTo);
  }
  let sql = `SELECT * FROM org_commitments WHERE ${parts.join(" AND ")}`;
  if (opts.q?.trim()) {
    sql += " AND (title LIKE ? ESCAPE '\\' OR IFNULL(description,'') LIKE ? ESCAPE '\\')";
    const qq = `%${opts.q.trim()}%`;
    params.push(qq, qq);
  }
  const orderCol =
    sort === "priority"
      ? "priority"
      : sort === "status"
        ? "status"
        : sort === "created_at"
          ? "created_at"
          : sort === "updated_at"
            ? "updated_at"
            : sort === "owner_id"
              ? "owner_id"
              : "deadline";
  sql += ` ORDER BY ${orderCol} ${order === "asc" ? "ASC" : "DESC"}`;
  const raw = d.prepare(sql).all(...params) as Record<string, unknown>[];
  let rows = raw.map((x) => mapRow(x));
  if (opts.q?.trim()) {
    const low = opts.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(low) ||
        (r.description?.toLowerCase().includes(low) ?? false)
    );
  }
  if (sort === "priority") {
    const mul = order === "asc" ? 1 : -1;
    rows = [...rows].sort(
      (a, b) => (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * mul
    );
  }
  return rows;
}

async function appendHistory(
  supabaseOrNull: ReturnType<typeof getServiceClient> | null,
  d: ReturnType<typeof getSqliteHandle> | null,
  row: {
    commitmentId: string;
    changedBy: string;
    fieldChanged: string;
    oldValue: string | null;
    newValue: string | null;
  }
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (supabaseOrNull) {
    const { error } = await supabaseOrNull.from("org_commitment_history").insert({
      id,
      commitment_id: row.commitmentId,
      changed_by: row.changedBy,
      field_changed: row.fieldChanged,
      old_value: row.oldValue,
      new_value: row.newValue,
      changed_at: now,
    });
    if (error) throw error;
    return;
  }
  if (!d) return;
  d.prepare(
    `INSERT INTO org_commitment_history (id, commitment_id, changed_by, field_changed, old_value, new_value, changed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    row.commitmentId,
    row.changedBy,
    row.fieldChanged,
    row.oldValue,
    row.newValue,
    now
  );
}

export async function recomputeOrgCommitmentStatusById(
  commitmentId: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: beforeRow, error: beforeErr } = await supabase
      .from("org_commitments")
      .select("status, org_id, owner_id, title, deadline")
      .eq("id", commitmentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (beforeErr) throw beforeErr;
    const prevStatus = beforeRow ? String((beforeRow as { status: string }).status) : null;

    const { error } = await supabase.rpc("recompute_org_commitment_status", {
      p_id: commitmentId,
    });
    if (error) throw error;

    const { data: afterRow, error: afterErr } = await supabase
      .from("org_commitments")
      .select("status, org_id, owner_id, title, deadline")
      .eq("id", commitmentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (afterErr) throw afterErr;
    if (
      afterRow &&
      prevStatus !== "overdue" &&
      String((afterRow as { status: string }).status) === "overdue"
    ) {
      const r = afterRow as {
        org_id: string;
        owner_id: string;
        title: string;
        deadline: string;
      };
      const title = String(r.title);
      void sendNotification({
        orgId: String(r.org_id),
        userId: String(r.owner_id),
        type: "commitment_overdue",
        title: `Overdue: ${title.slice(0, 70)}`,
        body: `This commitment is past its deadline (${formatDeadlineLine(String(r.deadline))}).`,
        metadata: {
          commitmentId,
          link: workspaceCommitmentLink(commitmentId),
          deadline: String(r.deadline),
        },
      });
      const { data: fullRow } = await supabase.from("org_commitments").select("*").eq("id", commitmentId).single();
      if (fullRow) {
        void import("@/lib/public-api/webhooks-events").then((m) =>
          m.emitCommitmentOverdue(String(r.org_id), mapRow(fullRow as Record<string, unknown>))
        );
      }
    }
    return;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT * FROM org_commitments WHERE id = ? AND deleted_at IS NULL`)
    .get(commitmentId) as Record<string, unknown> | undefined;
  if (!row) return;
  const prevStatus = String(row.status);
  const next = computeAutomaticOrgCommitmentStatus({
    deadline: String(row.deadline),
    lastActivityAt: String(row.last_activity_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
  });
  if (prevStatus !== next) {
    const now = new Date().toISOString();
    d.prepare(`UPDATE org_commitments SET status = ?, updated_at = ? WHERE id = ?`).run(
      next,
      now,
      commitmentId
    );
    if (prevStatus !== "overdue" && next === "overdue") {
      const title = String(row.title);
      void sendNotification({
        orgId: String(row.org_id),
        userId: String(row.owner_id),
        type: "commitment_overdue",
        title: `Overdue: ${title.slice(0, 70)}`,
        body: `This commitment is past its deadline (${formatDeadlineLine(String(row.deadline))}).`,
        metadata: {
          commitmentId,
          link: workspaceCommitmentLink(commitmentId),
          deadline: String(row.deadline),
        },
      });
      const full = d.prepare(`SELECT * FROM org_commitments WHERE id = ?`).get(commitmentId) as Record<
        string,
        unknown
      >;
      void import("@/lib/public-api/webhooks-events").then((m) =>
        m.emitCommitmentOverdue(String(row.org_id), mapRow(full))
      );
    }
  }
}

export async function recomputeAllOrgCommitmentStatuses(): Promise<number> {
  let n = 0;
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .select("id")
      .is("deleted_at", null);
    if (error) throw error;
    for (const r of data ?? []) {
      await recomputeOrgCommitmentStatusById(String((r as { id: string }).id));
      n += 1;
    }
    return n;
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT id FROM org_commitments WHERE deleted_at IS NULL`)
    .all() as { id: string }[];
  for (const r of rows) {
    await recomputeOrgCommitmentStatusById(r.id);
    n += 1;
  }
  return n;
}

export async function getOrgCommitmentDetail(
  userId: string,
  commitmentId: string
): Promise<OrgCommitmentDetail | null> {
  const orgId = await resolveOrgId(userId);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: row, error } = await supabase
      .from("org_commitments")
      .select("*")
      .eq("id", commitmentId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const base = mapRow(row as Record<string, unknown>);
    const [{ data: comments }, { data: attachments }, { data: history }, { data: deps }] =
      await Promise.all([
        supabase
          .from("org_commitment_comments")
          .select("*")
          .eq("commitment_id", commitmentId)
          .order("created_at", { ascending: true }),
        supabase
          .from("org_commitment_attachments")
          .select("*")
          .eq("commitment_id", commitmentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("org_commitment_history")
          .select("*")
          .eq("commitment_id", commitmentId)
          .order("changed_at", { ascending: false }),
        supabase
          .from("org_commitment_dependencies")
          .select("*")
          .eq("commitment_id", commitmentId),
      ]);
    const depIds = (deps ?? []).map((x) => (x as { depends_on_commitment_id: string }).depends_on_commitment_id);
    const titles: Record<string, string> = {};
    if (depIds.length) {
      const { data: titleRows } = await supabase
        .from("org_commitments")
        .select("id, title")
        .eq("org_id", orgId)
        .in("id", depIds);
      for (const t of titleRows ?? []) {
        const tr = t as { id: string; title: string };
        titles[tr.id] = tr.title;
      }
    }
    return {
      ...base,
      comments: (comments ?? []).map(
        (c) =>
          ({
            id: String((c as Record<string, unknown>).id),
            commitmentId: String((c as Record<string, unknown>).commitment_id),
            userId: String((c as Record<string, unknown>).user_id),
            content: String((c as Record<string, unknown>).content),
            createdAt: String((c as Record<string, unknown>).created_at),
          }) satisfies OrgCommitmentComment
      ),
      attachments: (attachments ?? []).map((a) => {
        const ar = a as Record<string, unknown>;
        return {
          id: String(ar.id),
          commitmentId: String(ar.commitment_id),
          userId: String(ar.user_id),
          fileName: String(ar.file_name),
          fileUrl: `/api/commitments/${commitmentId}/attachments/${String(ar.id)}/file`,
          createdAt: String(ar.created_at),
        } satisfies OrgCommitmentAttachment;
      }),
      history: (history ?? []).map(
        (h) =>
          ({
            id: String((h as Record<string, unknown>).id),
            commitmentId: String((h as Record<string, unknown>).commitment_id),
            changedBy: String((h as Record<string, unknown>).changed_by),
            fieldChanged: String((h as Record<string, unknown>).field_changed),
            oldValue:
              (h as Record<string, unknown>).old_value == null
                ? null
                : String((h as Record<string, unknown>).old_value),
            newValue:
              (h as Record<string, unknown>).new_value == null
                ? null
                : String((h as Record<string, unknown>).new_value),
            changedAt: String((h as Record<string, unknown>).changed_at),
          }) satisfies OrgCommitmentHistoryEntry
      ),
      dependencies: (deps ?? []).map(
        (x) =>
          ({
            id: String((x as Record<string, unknown>).id),
            commitmentId: String((x as Record<string, unknown>).commitment_id),
            dependsOnCommitmentId: String((x as Record<string, unknown>).depends_on_commitment_id),
          }) satisfies OrgCommitmentDependency
      ),
      dependencyTitles: titles,
    };
  }

  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT * FROM org_commitments WHERE id = ? AND org_id = ? AND deleted_at IS NULL`
    )
    .get(commitmentId, orgId) as Record<string, unknown> | undefined;
  if (!row) return null;
  const base = mapRow(row);
  const comments = d
    .prepare(
      `SELECT * FROM org_commitment_comments WHERE commitment_id = ? ORDER BY created_at ASC`
    )
    .all(commitmentId) as Record<string, unknown>[];
  const atts = d
    .prepare(
      `SELECT * FROM org_commitment_attachments WHERE commitment_id = ? ORDER BY created_at DESC`
    )
    .all(commitmentId) as Record<string, unknown>[];
  const history = d
    .prepare(
      `SELECT * FROM org_commitment_history WHERE commitment_id = ? ORDER BY changed_at DESC`
    )
    .all(commitmentId) as Record<string, unknown>[];
  const deps = d
    .prepare(`SELECT * FROM org_commitment_dependencies WHERE commitment_id = ?`)
    .all(commitmentId) as Record<string, unknown>[];
  const titles: Record<string, string> = {};
  for (const dep of deps) {
    const tid = String(dep.depends_on_commitment_id);
    const t = d
      .prepare(`SELECT title FROM org_commitments WHERE id = ? AND org_id = ?`)
      .get(tid, orgId) as { title: string } | undefined;
    if (t) titles[tid] = t.title;
  }
  return {
    ...base,
    comments: comments.map(
      (c) =>
        ({
          id: String(c.id),
          commitmentId: String(c.commitment_id),
          userId: String(c.user_id),
          content: String(c.content),
          createdAt: String(c.created_at),
        }) satisfies OrgCommitmentComment
    ),
    attachments: atts.map((a) => ({
      id: String(a.id),
      commitmentId: String(a.commitment_id),
      userId: String(a.user_id),
      fileName: String(a.file_name),
      fileUrl: String(a.file_url).startsWith("sqlite-local:")
        ? `/api/commitments/${commitmentId}/attachments/${String(a.id)}/file`
        : String(a.file_url),
      createdAt: String(a.created_at),
    })),
    history: history.map(
      (h) =>
        ({
          id: String(h.id),
          commitmentId: String(h.commitment_id),
          changedBy: String(h.changed_by),
          fieldChanged: String(h.field_changed),
          oldValue: h.old_value == null ? null : String(h.old_value),
          newValue: h.new_value == null ? null : String(h.new_value),
          changedAt: String(h.changed_at),
        }) satisfies OrgCommitmentHistoryEntry
    ),
    dependencies: deps.map(
      (x) =>
        ({
          id: String(x.id),
          commitmentId: String(x.commitment_id),
          dependsOnCommitmentId: String(x.depends_on_commitment_id),
        }) satisfies OrgCommitmentDependency
    ),
    dependencyTitles: titles,
  };
}

export async function createOrgCommitment(
  userId: string,
  input: {
    title: string;
    description: string | null;
    ownerId: string;
    projectId?: string | null;
    deadline: string;
    priority: OrgCommitmentPriority;
  }
): Promise<OrgCommitmentRow> {
  const orgId = await resolveOrgId(userId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const lastActivityAt = now;
  const completedAt = null;
  const status = computeAutomaticOrgCommitmentStatus({
    deadline: input.deadline,
    lastActivityAt,
    completedAt,
  });

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .insert({
        id,
        org_id: orgId,
        title: input.title,
        description: input.description,
        owner_id: input.ownerId,
        project_id: input.projectId ?? null,
        deadline: input.deadline,
        priority: input.priority,
        status,
        created_at: now,
        updated_at: now,
        completed_at: null,
        last_activity_at: lastActivityAt,
        deleted_at: null,
      })
      .select("*")
      .single();
    if (error) throw error;
    await appendHistory(supabase, null, {
      commitmentId: id,
      changedBy: userId,
      fieldChanged: "created",
      oldValue: null,
      newValue: "1",
    });
    await recomputeOrgCommitmentStatusById(id);
    const { data: final } = await supabase.from("org_commitments").select("*").eq("id", id).single();
    const out = mapRow((final ?? data) as Record<string, unknown>);
    void import("@/lib/public-api/webhooks-events").then((m) => m.emitCommitmentCreated(orgId, out));
    void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
      m.syncCalendarDeadlinesForCommitment(orgId, out)
    );
    return out;
  }

  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO org_commitments (
      id, org_id, title, description, owner_id, project_id, deadline, priority, status,
      created_at, updated_at, completed_at, last_activity_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    orgId,
    input.title,
    input.description,
    input.ownerId,
    input.projectId ?? null,
    input.deadline,
    input.priority,
    status,
    now,
    now,
    null,
    lastActivityAt,
    null
  );
  await appendHistory(null, d, {
    commitmentId: id,
    changedBy: userId,
    fieldChanged: "created",
    oldValue: null,
    newValue: "1",
  });
  await recomputeOrgCommitmentStatusById(id);
  const row = d.prepare(`SELECT * FROM org_commitments WHERE id = ?`).get(id) as Record<string, unknown>;
  const out = mapRow(row);
  void import("@/lib/public-api/webhooks-events").then((m) => m.emitCommitmentCreated(orgId, out));
  void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
    m.syncCalendarDeadlinesForCommitment(orgId, out)
  );
  return out;
}

export async function updateOrgCommitment(
  userId: string,
  commitmentId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    ownerId: string;
    projectId: string | null;
    deadline: string;
    priority: OrgCommitmentPriority;
    completed: boolean;
  }>
): Promise<{ row: OrgCommitmentRow; previousOwnerId: string | null }> {
  const orgId = await resolveOrgId(userId);
  const existing = await getOrgCommitmentDetail(userId, commitmentId);
  if (!existing) throw new Error("NOT_FOUND");
  const previousOwnerId = existing.ownerId;

  const now = new Date().toISOString();
  const title = patch.title !== undefined ? patch.title : existing.title;
  const description = patch.description !== undefined ? patch.description : existing.description;
  const ownerId = patch.ownerId !== undefined ? patch.ownerId : existing.ownerId;
  const projectId =
    patch.projectId !== undefined ? patch.projectId : existing.projectId ?? null;
  const deadline = patch.deadline !== undefined ? patch.deadline : existing.deadline;
  const priority = patch.priority !== undefined ? patch.priority : existing.priority;

  let completedAt = existing.completedAt;
  if (patch.completed === true) completedAt = now;
  if (patch.completed === false) completedAt = null;

  const lastActivityAt = now;

  let status: OrgCommitmentStatus;
  if (completedAt) {
    status = "completed";
  } else {
    status = computeAutomaticOrgCommitmentStatus({
      deadline,
      lastActivityAt,
      completedAt: null,
    });
  }

  const fields: Record<string, unknown> = {
    title,
    description,
    owner_id: ownerId,
    project_id: projectId,
    deadline,
    priority,
    updated_at: now,
    last_activity_at: lastActivityAt,
    completed_at: completedAt,
    status,
  };

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .update(fields)
      .eq("id", commitmentId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw error;
    if (patch.title !== undefined && patch.title !== existing.title) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "title",
        oldValue: existing.title,
        newValue: patch.title,
      });
    }
    if (patch.description !== undefined && patch.description !== existing.description) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "description",
        oldValue: existing.description,
        newValue: patch.description,
      });
    }
    if (patch.ownerId !== undefined && patch.ownerId !== existing.ownerId) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "owner_id",
        oldValue: existing.ownerId,
        newValue: patch.ownerId,
      });
    }
    if (patch.deadline !== undefined && patch.deadline !== existing.deadline) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "deadline",
        oldValue: existing.deadline,
        newValue: patch.deadline,
      });
    }
    if (patch.priority !== undefined && patch.priority !== existing.priority) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "priority",
        oldValue: existing.priority,
        newValue: patch.priority,
      });
    }
    if (patch.projectId !== undefined && patch.projectId !== (existing.projectId ?? null)) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "project_id",
        oldValue: existing.projectId,
        newValue: patch.projectId,
      });
    }
    await recomputeOrgCommitmentStatusById(commitmentId);
    const { data: fin } = await supabase.from("org_commitments").select("*").eq("id", commitmentId).single();
    if (patch.completed === true && !existing.completedAt) {
      void import("@/lib/integrations/notion-writeback").then((m) =>
        m.maybeNotionWritebackOnCommitmentCompleted({
          orgId,
          commitmentId,
          ownerId,
        })
      );
    }
    const updatedRow = mapRow((fin ?? data) as Record<string, unknown>);
    void import("@/lib/public-api/webhooks-events").then((m) =>
      m.emitCommitmentUpdated(orgId, updatedRow, {
        status: existing.status,
        completedAt: existing.completedAt,
      })
    );
    void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
      m.syncCalendarDeadlinesForCommitment(orgId, updatedRow)
    );
    return { row: updatedRow, previousOwnerId };
  }

  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_commitments SET
      title = ?,
      description = ?,
      owner_id = ?,
      project_id = ?,
      deadline = ?,
      priority = ?,
      updated_at = ?,
      last_activity_at = ?,
      completed_at = ?,
      status = ?
    WHERE id = ? AND org_id = ? AND deleted_at IS NULL`
  ).run(
    title,
    description,
    ownerId,
    projectId,
    deadline,
    priority,
    now,
    lastActivityAt,
    completedAt,
    status,
    commitmentId,
    orgId
  );
  if (patch.title !== undefined && patch.title !== existing.title) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "title",
      oldValue: existing.title,
      newValue: patch.title,
    });
  }
  if (patch.description !== undefined && patch.description !== existing.description) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "description",
      oldValue: existing.description,
      newValue: patch.description ?? null,
    });
  }
  if (patch.ownerId !== undefined && patch.ownerId !== existing.ownerId) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "owner_id",
      oldValue: existing.ownerId,
      newValue: patch.ownerId,
    });
  }
  if (patch.deadline !== undefined && patch.deadline !== existing.deadline) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "deadline",
      oldValue: existing.deadline,
      newValue: patch.deadline,
    });
  }
  if (patch.priority !== undefined && patch.priority !== existing.priority) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "priority",
      oldValue: existing.priority,
      newValue: patch.priority,
    });
  }
  if (patch.projectId !== undefined && patch.projectId !== (existing.projectId ?? null)) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "project_id",
      oldValue: existing.projectId,
      newValue: patch.projectId,
    });
  }
  await recomputeOrgCommitmentStatusById(commitmentId);
  const row = d.prepare(`SELECT * FROM org_commitments WHERE id = ?`).get(commitmentId) as Record<
    string,
    unknown
  >;
  if (patch.completed === true && !existing.completedAt) {
    void import("@/lib/integrations/notion-writeback").then((m) =>
      m.maybeNotionWritebackOnCommitmentCompleted({
        orgId,
        commitmentId,
        ownerId,
      })
    );
  }
  const updatedRow = mapRow(row);
  void import("@/lib/public-api/webhooks-events").then((m) =>
    m.emitCommitmentUpdated(orgId, updatedRow, {
      status: existing.status,
      completedAt: existing.completedAt,
    })
  );
  void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
    m.syncCalendarDeadlinesForCommitment(orgId, updatedRow)
  );
  return { row: updatedRow, previousOwnerId };
}

export async function softDeleteOrgCommitment(
  userId: string,
  commitmentId: string
): Promise<boolean> {
  const orgId = await resolveOrgId(userId);
  const existing = await getOrgCommitmentDetail(userId, commitmentId);
  if (!existing) return false;
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", commitmentId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select("id");
    if (error) throw error;
    const ok = (data?.length ?? 0) > 0;
    if (ok) {
      void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
        m.syncCalendarDeadlinesForCommitment(orgId, { ...existing, deletedAt: now })
      );
    }
    return ok;
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(
      `UPDATE org_commitments SET deleted_at = ?, updated_at = ? WHERE id = ? AND org_id = ? AND deleted_at IS NULL`
    )
    .run(now, now, commitmentId, orgId);
  const ok = r.changes > 0;
  if (ok) {
    void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
      m.syncCalendarDeadlinesForCommitment(orgId, { ...existing, deletedAt: now })
    );
  }
  return ok;
}

export async function addOrgCommitmentComment(
  userId: string,
  commitmentId: string,
  content: string
): Promise<OrgCommitmentComment> {
  const orgId = await resolveOrgId(userId);
  const ex = await getOrgCommitmentDetail(userId, commitmentId);
  if (!ex) throw new Error("NOT_FOUND");
  void orgId;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("org_commitment_comments").insert({
      id,
      commitment_id: commitmentId,
      user_id: userId,
      content,
      created_at: now,
    });
    if (error) throw error;
    await supabase
      .from("org_commitments")
      .update({ last_activity_at: now, updated_at: now })
      .eq("id", commitmentId);
    await recomputeOrgCommitmentStatusById(commitmentId);
    return {
      id,
      commitmentId,
      userId,
      content,
      createdAt: now,
    };
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO org_commitment_comments (id, commitment_id, user_id, content, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, commitmentId, userId, content, now);
  d.prepare(`UPDATE org_commitments SET last_activity_at = ?, updated_at = ? WHERE id = ?`).run(
    now,
    now,
    commitmentId
  );
  await recomputeOrgCommitmentStatusById(commitmentId);
  return { id, commitmentId, userId, content, createdAt: now };
}

export async function addOrgCommitmentAttachment(
  userId: string,
  commitmentId: string,
  fileName: string,
  file: Buffer,
  mime: string
): Promise<OrgCommitmentAttachment> {
  const orgId = await resolveOrgId(userId);
  const ex = await getOrgCommitmentDetail(userId, commitmentId);
  if (!ex) throw new Error("NOT_FOUND");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const objectPath = `${orgId}/${commitmentId}/${nanoid()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file, { contentType: mime || "application/octet-stream", upsert: false });
    if (upErr) throw upErr;
    const { error } = await supabase.from("org_commitment_attachments").insert({
      id,
      commitment_id: commitmentId,
      user_id: userId,
      file_name: safeName,
      file_url: objectPath,
      created_at: now,
    });
    if (error) throw error;
    await supabase
      .from("org_commitments")
      .update({ last_activity_at: now, updated_at: now })
      .eq("id", commitmentId);
    await recomputeOrgCommitmentStatusById(commitmentId);
    return {
      id,
      commitmentId,
      userId,
      fileName: safeName,
      fileUrl: `/api/commitments/${commitmentId}/attachments/${id}/file`,
      createdAt: now,
    };
  }

  const dir = path.join(
    process.cwd(),
    "data",
    "org-commitment-uploads",
    orgId,
    commitmentId
  );
  fs.mkdirSync(dir, { recursive: true });
  const localPath = path.join(dir, `${id}-${safeName}`);
  fs.writeFileSync(localPath, file);
  const d = getSqliteHandle();
  const token = `sqlite-local:${id}`;
  d.prepare(
    `INSERT INTO org_commitment_attachments (
      id, commitment_id, user_id, file_name, file_url, storage_kind, local_path, created_at
    ) VALUES (?, ?, ?, ?, ?, 'local', ?, ?)`
  ).run(id, commitmentId, userId, safeName, token, localPath, now);
  d.prepare(`UPDATE org_commitments SET last_activity_at = ?, updated_at = ? WHERE id = ?`).run(
    now,
    now,
    commitmentId
  );
  await recomputeOrgCommitmentStatusById(commitmentId);
  return {
    id,
    commitmentId,
    userId,
    fileName: safeName,
    fileUrl: `/api/commitments/${commitmentId}/attachments/${id}/file`,
    createdAt: now,
  };
}

export async function addOrgCommitmentDependency(
  userId: string,
  commitmentId: string,
  dependsOnCommitmentId: string
): Promise<void> {
  const orgId = await resolveOrgId(userId);
  if (commitmentId === dependsOnCommitmentId) throw new Error("INVALID_DEP");
  const a = await getOrgCommitmentDetail(userId, commitmentId);
  const b = await getOrgCommitmentDetail(userId, dependsOnCommitmentId);
  if (!a || !b) throw new Error("NOT_FOUND");
  void orgId;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("org_commitment_dependencies").insert({
      id,
      commitment_id: commitmentId,
      depends_on_commitment_id: dependsOnCommitmentId,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") throw new Error("DUPLICATE_DEP");
      throw error;
    }
    await supabase
      .from("org_commitments")
      .update({ last_activity_at: now, updated_at: now })
      .eq("id", commitmentId);
    await recomputeOrgCommitmentStatusById(commitmentId);
    return;
  }
  const d = getSqliteHandle();
  try {
    d.prepare(
      `INSERT INTO org_commitment_dependencies (id, commitment_id, depends_on_commitment_id) VALUES (?, ?, ?)`
    ).run(id, commitmentId, dependsOnCommitmentId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) throw new Error("DUPLICATE_DEP");
    throw e;
  }
  d.prepare(`UPDATE org_commitments SET last_activity_at = ?, updated_at = ? WHERE id = ?`).run(
    now,
    now,
    commitmentId
  );
  await recomputeOrgCommitmentStatusById(commitmentId);
}

/** SQLite: resolve attachment for download after ownership check (Clerk user owns org). */
export function getSqliteAttachmentForDownload(
  userId: string,
  commitmentId: string,
  attachmentId: string
): { localPath: string; fileName: string } | null {
  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT a.local_path as local_path, a.file_name as file_name
       FROM org_commitment_attachments a
       INNER JOIN org_commitments c ON c.id = a.commitment_id AND c.deleted_at IS NULL
       INNER JOIN organizations o ON o.id = c.org_id AND o.clerk_user_id = ?
       WHERE a.id = ? AND a.commitment_id = ?`
    )
    .get(userId, attachmentId, commitmentId) as
    | { local_path: string | null; file_name: string }
    | undefined;
  if (!row?.local_path) return null;
  return { localPath: row.local_path, fileName: row.file_name };
}

/** Create commitment as the org owner (Slack / automation). */
export async function createOrgCommitmentAsOrgOwner(
  orgId: string,
  input: {
    title: string;
    description: string | null;
    ownerId: string;
    deadline: string;
    priority: OrgCommitmentPriority;
  }
): Promise<OrgCommitmentRow> {
  const owner = await getOrganizationClerkUserId(orgId);
  if (!owner) throw new Error("Organization not found");
  return createOrgCommitment(owner, input);
}

const API_ACTOR = (apiKeyId: string) => `api_key:${apiKeyId}`;

/** Public API: list commitments with pagination (same filters as workspace list). */
export async function listOrgCommitmentsForOrgId(
  orgId: string,
  opts: {
    status?: string;
    priority?: string;
    owner?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string;
    sort?: OrgCommitmentListSort;
    order?: "asc" | "desc";
    limit: number;
    offset: number;
  }
): Promise<{ rows: OrgCommitmentRow[]; total: number }> {
  const sort = opts.sort ?? "deadline";
  const order = opts.order ?? "asc";
  const limit = Math.min(100, Math.max(1, opts.limit));
  const offset = Math.max(0, opts.offset);

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    let q = supabase
      .from("org_commitments")
      .select("*")
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.priority) q = q.eq("priority", opts.priority);
    if (opts.owner) q = q.eq("owner_id", opts.owner);
    if (opts.dateFrom) q = q.gte("deadline", opts.dateFrom);
    if (opts.dateTo) q = q.lte("deadline", opts.dateTo);
    if (sort === "priority") {
      q = q.order("priority", { ascending: order === "asc" });
    } else {
      const col =
        sort === "created_at"
          ? "created_at"
          : sort === "updated_at"
            ? "updated_at"
            : sort === "status"
              ? "status"
              : sort === "owner_id"
                ? "owner_id"
                : "deadline";
      q = q.order(col, { ascending: order === "asc" });
    }
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map((x) => mapRow(x as Record<string, unknown>));
    if (opts.q?.trim()) {
      const low = opts.q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(low) || (r.description?.toLowerCase().includes(low) ?? false)
      );
    }
    if (sort === "priority") {
      const mul = order === "asc" ? 1 : -1;
      rows = [...rows].sort(
        (a, b) => (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * mul
      );
    }
    const total = rows.length;
    const page = rows.slice(offset, offset + limit);
    return { rows: page, total };
  }

  const d = getSqliteHandle();
  const parts: string[] = ["org_id = ?", "deleted_at IS NULL"];
  const params: unknown[] = [orgId];
  if (opts.status) {
    parts.push("status = ?");
    params.push(opts.status);
  }
  if (opts.priority) {
    parts.push("priority = ?");
    params.push(opts.priority);
  }
  if (opts.owner) {
    parts.push("owner_id = ?");
    params.push(opts.owner);
  }
  if (opts.dateFrom) {
    parts.push("deadline >= ?");
    params.push(opts.dateFrom);
  }
  if (opts.dateTo) {
    parts.push("deadline <= ?");
    params.push(opts.dateTo);
  }
  let sql = `SELECT * FROM org_commitments WHERE ${parts.join(" AND ")}`;
  if (opts.q?.trim()) {
    sql +=
      " AND (title LIKE ? ESCAPE '\\' OR IFNULL(description,'') LIKE ? ESCAPE '\\')";
    const qq = `%${opts.q.trim()}%`;
    params.push(qq, qq);
  }
  const orderCol =
    sort === "priority"
      ? "priority"
      : sort === "status"
        ? "status"
        : sort === "created_at"
          ? "created_at"
          : sort === "updated_at"
            ? "updated_at"
            : sort === "owner_id"
              ? "owner_id"
              : "deadline";
  sql += ` ORDER BY ${orderCol} ${order === "asc" ? "ASC" : "DESC"}`;
  const raw = d.prepare(sql).all(...params) as Record<string, unknown>[];
  let rows = raw.map((x) => mapRow(x));
  if (opts.q?.trim()) {
    const low = opts.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(low) || (r.description?.toLowerCase().includes(low) ?? false)
    );
  }
  if (sort === "priority") {
    const mul = order === "asc" ? 1 : -1;
    rows = [...rows].sort(
      (a, b) => (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * mul
    );
  }
  const total = rows.length;
  const page = rows.slice(offset, offset + limit);
  return { rows: page, total };
}

export async function getOrgCommitmentDetailForOrgId(
  orgId: string,
  commitmentId: string
): Promise<OrgCommitmentDetail | null> {
  return getOrgCommitmentDetailByOrgIdInternal(orgId, commitmentId);
}

async function getOrgCommitmentDetailByOrgIdInternal(
  orgId: string,
  commitmentId: string
): Promise<OrgCommitmentDetail | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: row, error } = await supabase
      .from("org_commitments")
      .select("*")
      .eq("id", commitmentId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const base = mapRow(row as Record<string, unknown>);
    const [{ data: comments }, { data: attachments }, { data: history }, { data: deps }] =
      await Promise.all([
        supabase
          .from("org_commitment_comments")
          .select("*")
          .eq("commitment_id", commitmentId)
          .order("created_at", { ascending: true }),
        supabase
          .from("org_commitment_attachments")
          .select("*")
          .eq("commitment_id", commitmentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("org_commitment_history")
          .select("*")
          .eq("commitment_id", commitmentId)
          .order("changed_at", { ascending: false }),
        supabase
          .from("org_commitment_dependencies")
          .select("*")
          .eq("commitment_id", commitmentId),
      ]);
    const depIds = (deps ?? []).map((x) => (x as { depends_on_commitment_id: string }).depends_on_commitment_id);
    const titles: Record<string, string> = {};
    if (depIds.length) {
      const { data: titleRows } = await supabase
        .from("org_commitments")
        .select("id, title")
        .eq("org_id", orgId)
        .in("id", depIds);
      for (const t of titleRows ?? []) {
        const tr = t as { id: string; title: string };
        titles[tr.id] = tr.title;
      }
    }
    return {
      ...base,
      comments: (comments ?? []).map(
        (c) =>
          ({
            id: String((c as Record<string, unknown>).id),
            commitmentId: String((c as Record<string, unknown>).commitment_id),
            userId: String((c as Record<string, unknown>).user_id),
            content: String((c as Record<string, unknown>).content),
            createdAt: String((c as Record<string, unknown>).created_at),
          }) satisfies OrgCommitmentComment
      ),
      attachments: (attachments ?? []).map((a) => {
        const ar = a as Record<string, unknown>;
        return {
          id: String(ar.id),
          commitmentId: String(ar.commitment_id),
          userId: String(ar.user_id),
          fileName: String(ar.file_name),
          fileUrl: `/api/commitments/${commitmentId}/attachments/${String(ar.id)}/file`,
          createdAt: String(ar.created_at),
        } satisfies OrgCommitmentAttachment;
      }),
      history: (history ?? []).map(
        (h) =>
          ({
            id: String((h as Record<string, unknown>).id),
            commitmentId: String((h as Record<string, unknown>).commitment_id),
            changedBy: String((h as Record<string, unknown>).changed_by),
            fieldChanged: String((h as Record<string, unknown>).field_changed),
            oldValue:
              (h as Record<string, unknown>).old_value == null
                ? null
                : String((h as Record<string, unknown>).old_value),
            newValue:
              (h as Record<string, unknown>).new_value == null
                ? null
                : String((h as Record<string, unknown>).new_value),
            changedAt: String((h as Record<string, unknown>).changed_at),
          }) satisfies OrgCommitmentHistoryEntry
      ),
      dependencies: (deps ?? []).map(
        (x) =>
          ({
            id: String((x as Record<string, unknown>).id),
            commitmentId: String((x as Record<string, unknown>).commitment_id),
            dependsOnCommitmentId: String((x as Record<string, unknown>).depends_on_commitment_id),
          }) satisfies OrgCommitmentDependency
      ),
      dependencyTitles: titles,
    };
  }

  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT * FROM org_commitments WHERE id = ? AND org_id = ? AND deleted_at IS NULL`
    )
    .get(commitmentId, orgId) as Record<string, unknown> | undefined;
  if (!row) return null;
  const base = mapRow(row);
  const comments = d
    .prepare(
      `SELECT * FROM org_commitment_comments WHERE commitment_id = ? ORDER BY created_at ASC`
    )
    .all(commitmentId) as Record<string, unknown>[];
  const atts = d
    .prepare(
      `SELECT * FROM org_commitment_attachments WHERE commitment_id = ? ORDER BY created_at DESC`
    )
    .all(commitmentId) as Record<string, unknown>[];
  const history = d
    .prepare(
      `SELECT * FROM org_commitment_history WHERE commitment_id = ? ORDER BY changed_at DESC`
    )
    .all(commitmentId) as Record<string, unknown>[];
  const deps = d
    .prepare(`SELECT * FROM org_commitment_dependencies WHERE commitment_id = ?`)
    .all(commitmentId) as Record<string, unknown>[];
  const titles: Record<string, string> = {};
  for (const dep of deps) {
    const tid = String(dep.depends_on_commitment_id);
    const t = d
      .prepare(`SELECT title FROM org_commitments WHERE id = ? AND org_id = ?`)
      .get(tid, orgId) as { title: string } | undefined;
    if (t) titles[tid] = t.title;
  }
  return {
    ...base,
    comments: comments.map(
      (c) =>
        ({
          id: String(c.id),
          commitmentId: String(c.commitment_id),
          userId: String(c.user_id),
          content: String(c.content),
          createdAt: String(c.created_at),
        }) satisfies OrgCommitmentComment
    ),
    attachments: atts.map((a) => ({
      id: String(a.id),
      commitmentId: String(a.commitment_id),
      userId: String(a.user_id),
      fileName: String(a.file_name),
      fileUrl: String(a.file_url).startsWith("sqlite-local:")
        ? `/api/commitments/${commitmentId}/attachments/${String(a.id)}/file`
        : String(a.file_url),
      createdAt: String(a.created_at),
    })),
    history: history.map(
      (h) =>
        ({
          id: String(h.id),
          commitmentId: String(h.commitment_id),
          changedBy: String(h.changed_by),
          fieldChanged: String(h.field_changed),
          oldValue: h.old_value == null ? null : String(h.old_value),
          newValue: h.new_value == null ? null : String(h.new_value),
          changedAt: String(h.changed_at),
        }) satisfies OrgCommitmentHistoryEntry
    ),
    dependencies: deps.map(
      (x) =>
        ({
          id: String(x.id),
          commitmentId: String(x.commitment_id),
          dependsOnCommitmentId: String(x.depends_on_commitment_id),
        }) satisfies OrgCommitmentDependency
    ),
    dependencyTitles: titles,
  };
}

/** Public API: create with api_key actor in history. */
export async function createOrgCommitmentForPublicApi(
  orgId: string,
  apiKeyId: string,
  input: {
    title: string;
    description: string | null;
    ownerId: string;
    deadline: string;
    priority: OrgCommitmentPriority;
  }
): Promise<OrgCommitmentRow> {
  const actor = API_ACTOR(apiKeyId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const lastActivityAt = now;
  const completedAt = null;
  const status = computeAutomaticOrgCommitmentStatus({
    deadline: input.deadline,
    lastActivityAt,
    completedAt,
  });

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .insert({
        id,
        org_id: orgId,
        title: input.title,
        description: input.description,
        owner_id: input.ownerId,
        project_id: null,
        deadline: input.deadline,
        priority: input.priority,
        status,
        created_at: now,
        updated_at: now,
        completed_at: null,
        last_activity_at: lastActivityAt,
        deleted_at: null,
      })
      .select("*")
      .single();
    if (error) throw error;
    await appendHistory(supabase, null, {
      commitmentId: id,
      changedBy: actor,
      fieldChanged: "created",
      oldValue: null,
      newValue: "1",
    });
    await recomputeOrgCommitmentStatusById(id);
    const { data: final } = await supabase.from("org_commitments").select("*").eq("id", id).single();
    const out = mapRow((final ?? data) as Record<string, unknown>);
    void import("@/lib/public-api/webhooks-events").then((m) => m.emitCommitmentCreated(orgId, out));
    void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
      m.syncCalendarDeadlinesForCommitment(orgId, out)
    );
    return out;
  }

  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO org_commitments (
      id, org_id, title, description, owner_id, project_id, deadline, priority, status,
      created_at, updated_at, completed_at, last_activity_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    orgId,
    input.title,
    input.description,
    input.ownerId,
    null,
    input.deadline,
    input.priority,
    status,
    now,
    now,
    null,
    lastActivityAt,
    null
  );
  await appendHistory(null, d, {
    commitmentId: id,
    changedBy: actor,
    fieldChanged: "created",
    oldValue: null,
    newValue: "1",
  });
  await recomputeOrgCommitmentStatusById(id);
  const row = d.prepare(`SELECT * FROM org_commitments WHERE id = ?`).get(id) as Record<string, unknown>;
  const created = mapRow(row);
  void import("@/lib/public-api/webhooks-events").then((m) => m.emitCommitmentCreated(orgId, created));
  void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
    m.syncCalendarDeadlinesForCommitment(orgId, created)
  );
  return created;
}

export async function updateOrgCommitmentForPublicApi(
  orgId: string,
  apiKeyId: string,
  commitmentId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    owner_id: string;
    deadline: string;
    priority: OrgCommitmentPriority;
    completed: boolean;
  }>
): Promise<{ row: OrgCommitmentRow; previousStatus: OrgCommitmentStatus; previousCompletedAt: string | null }> {
  const actor = API_ACTOR(apiKeyId);
  const existing = await getOrgCommitmentDetailByOrgIdInternal(orgId, commitmentId);
  if (!existing) throw new Error("NOT_FOUND");
  const previousStatus = existing.status;
  const previousCompletedAt = existing.completedAt;

  const userId = actor;
  const now = new Date().toISOString();
  const title = patch.title !== undefined ? patch.title : existing.title;
  const description = patch.description !== undefined ? patch.description : existing.description;
  const ownerId = patch.owner_id !== undefined ? patch.owner_id : existing.ownerId;
  const deadline = patch.deadline !== undefined ? patch.deadline : existing.deadline;
  const priority = patch.priority !== undefined ? patch.priority : existing.priority;

  let completedAt = existing.completedAt;
  if (patch.completed === true) completedAt = now;
  if (patch.completed === false) completedAt = null;

  const lastActivityAt = now;

  let status: OrgCommitmentStatus;
  if (completedAt) {
    status = "completed";
  } else {
    status = computeAutomaticOrgCommitmentStatus({
      deadline,
      lastActivityAt,
      completedAt: null,
    });
  }

  const fields: Record<string, unknown> = {
    title,
    description,
    owner_id: ownerId,
    deadline,
    priority,
    updated_at: now,
    last_activity_at: lastActivityAt,
    completed_at: completedAt,
    status,
  };

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .update(fields)
      .eq("id", commitmentId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw error;
    if (patch.title !== undefined && patch.title !== existing.title) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "title",
        oldValue: existing.title,
        newValue: patch.title,
      });
    }
    if (patch.description !== undefined && patch.description !== existing.description) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "description",
        oldValue: existing.description,
        newValue: patch.description,
      });
    }
    if (patch.owner_id !== undefined && patch.owner_id !== existing.ownerId) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "owner_id",
        oldValue: existing.ownerId,
        newValue: patch.owner_id,
      });
    }
    if (patch.deadline !== undefined && patch.deadline !== existing.deadline) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "deadline",
        oldValue: existing.deadline,
        newValue: patch.deadline,
      });
    }
    if (patch.priority !== undefined && patch.priority !== existing.priority) {
      await appendHistory(supabase, null, {
        commitmentId,
        changedBy: userId,
        fieldChanged: "priority",
        oldValue: existing.priority,
        newValue: patch.priority,
      });
    }
    await recomputeOrgCommitmentStatusById(commitmentId);
    const { data: fin } = await supabase.from("org_commitments").select("*").eq("id", commitmentId).single();
    if (patch.completed === true && !existing.completedAt) {
      void import("@/lib/integrations/notion-writeback").then((m) =>
        m.maybeNotionWritebackOnCommitmentCompleted({
          orgId,
          commitmentId,
          ownerId,
        })
      );
    }
    const updatedRow = mapRow((fin ?? data) as Record<string, unknown>);
    void import("@/lib/public-api/webhooks-events").then((m) =>
      m.emitCommitmentUpdated(orgId, updatedRow, {
        status: previousStatus,
        completedAt: previousCompletedAt,
      })
    );
    void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
      m.syncCalendarDeadlinesForCommitment(orgId, updatedRow)
    );
    return {
      row: updatedRow,
      previousStatus,
      previousCompletedAt,
    };
  }

  const d = getSqliteHandle();
  d.prepare(
    `UPDATE org_commitments SET
      title = ?,
      description = ?,
      owner_id = ?,
      deadline = ?,
      priority = ?,
      updated_at = ?,
      last_activity_at = ?,
      completed_at = ?,
      status = ?
    WHERE id = ? AND org_id = ? AND deleted_at IS NULL`
  ).run(
    title,
    description,
    ownerId,
    deadline,
    priority,
    now,
    lastActivityAt,
    completedAt,
    status,
    commitmentId,
    orgId
  );
  if (patch.title !== undefined && patch.title !== existing.title) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "title",
      oldValue: existing.title,
      newValue: patch.title,
    });
  }
  if (patch.description !== undefined && patch.description !== existing.description) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "description",
      oldValue: existing.description,
      newValue: patch.description ?? null,
    });
  }
  if (patch.owner_id !== undefined && patch.owner_id !== existing.ownerId) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "owner_id",
      oldValue: existing.ownerId,
      newValue: patch.owner_id,
    });
  }
  if (patch.deadline !== undefined && patch.deadline !== existing.deadline) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "deadline",
      oldValue: existing.deadline,
      newValue: patch.deadline,
    });
  }
  if (patch.priority !== undefined && patch.priority !== existing.priority) {
    await appendHistory(null, d, {
      commitmentId,
      changedBy: userId,
      fieldChanged: "priority",
      oldValue: existing.priority,
      newValue: patch.priority,
    });
  }
  await recomputeOrgCommitmentStatusById(commitmentId);
  const row = d.prepare(`SELECT * FROM org_commitments WHERE id = ?`).get(commitmentId) as Record<
    string,
    unknown
  >;
  if (patch.completed === true && !existing.completedAt) {
    void import("@/lib/integrations/notion-writeback").then((m) =>
      m.maybeNotionWritebackOnCommitmentCompleted({
        orgId,
        commitmentId,
        ownerId,
      })
    );
  }
  const updatedRow = mapRow(row);
  void import("@/lib/public-api/webhooks-events").then((m) =>
    m.emitCommitmentUpdated(orgId, updatedRow, {
      status: previousStatus,
      completedAt: previousCompletedAt,
    })
  );
  void import("@/lib/integrations/calendar-deadline-sync").then((m) =>
    m.syncCalendarDeadlinesForCommitment(orgId, updatedRow)
  );
  return { row: updatedRow, previousStatus, previousCompletedAt };
}

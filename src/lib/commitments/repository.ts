import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { listProjectsForUser, verifyProjectOwned } from "@/lib/workspace/store";

export type CommitmentStatus = "pending" | "in_progress" | "done";

export type CommitmentRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  owner: string | null;
  status: CommitmentStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommitmentCreateInput = {
  projectId: string;
  title: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  dueDate?: string | null;
};

export type CommitmentUpdateInput = {
  title?: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  dueDate?: string | null;
};

type DbRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  owner: string | null;
  owner_display_name: string | null;
  owner_user_id: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
  last_updated_at: string | null;
};

function requireSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required for commitments.");
  }
}

function toStatus(raw: string): CommitmentStatus {
  if (raw === "done" || raw === "pending" || raw === "in_progress") return raw;
  if (raw === "completed") return "done";
  return "in_progress";
}

function mapRow(row: DbRow): CommitmentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    owner: row.owner ?? row.owner_display_name ?? row.owner_user_id ?? null,
    status: toStatus(row.status),
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.last_updated_at ?? row.created_at,
  };
}

async function allowedProjectIds(userId: string): Promise<string[]> {
  const projects = await listProjectsForUser(userId);
  return projects.map((p) => p.id);
}

export async function fetchCommitments(
  userId: string,
  filters?: { projectId?: string; status?: CommitmentStatus | "active" }
): Promise<CommitmentRecord[]> {
  requireSupabaseConfigured();
  const projectIds = await allowedProjectIds(userId);
  if (projectIds.length === 0) return [];
  if (filters?.projectId && !projectIds.includes(filters.projectId)) return [];

  const supabase = getServiceClient();
  let query = supabase
    .from("commitments")
    .select(
      "id, project_id, title, description, owner, owner_display_name, owner_user_id, status, due_date, created_at, updated_at, last_updated_at"
    )
    .in("project_id", filters?.projectId ? [filters.projectId] : projectIds)
    .is("archived_at", null)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (filters?.status && filters.status !== "active") {
    query = query.eq("status", filters.status);
  }
  if (filters?.status === "active") {
    query = query.neq("status", "done");
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as DbRow));
}

export async function createCommitment(
  userId: string,
  input: CommitmentCreateInput
): Promise<CommitmentRecord> {
  requireSupabaseConfigured();
  const access = await verifyProjectOwned(userId, input.projectId);
  if (!access) throw new Error("FORBIDDEN");
  const status = input.status ?? "pending";
  const now = new Date().toISOString();
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      project_id: input.projectId,
      clerk_user_id: userId,
      title: input.title.trim(),
      description: input.description ?? null,
      owner: input.owner?.trim() || null,
      owner_display_name: input.owner?.trim() || null,
      owner_user_id: null,
      source: "manual",
      source_reference: "desk",
      status,
      priority: "medium",
      due_date: input.dueDate ?? null,
      updated_at: now,
      last_updated_at: now,
      activity_log: [],
      archived_at: null,
    })
    .select(
      "id, project_id, title, description, owner, owner_display_name, owner_user_id, status, due_date, created_at, updated_at, last_updated_at"
    )
    .single();
  if (error) throw error;
  return mapRow(data as DbRow);
}

export async function updateCommitment(
  userId: string,
  id: string,
  updates: CommitmentUpdateInput
): Promise<CommitmentRecord | null> {
  requireSupabaseConfigured();
  const all = await fetchCommitments(userId);
  const existing = all.find((row) => row.id === id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("commitments")
    .update({
      title: updates.title?.trim() ?? existing.title,
      description:
        updates.description === undefined ? existing.description : updates.description,
      owner:
        updates.owner === undefined ? existing.owner : updates.owner?.trim() || null,
      owner_display_name:
        updates.owner === undefined ? existing.owner : updates.owner?.trim() || null,
      status: updates.status ?? existing.status,
      due_date: updates.dueDate === undefined ? existing.dueDate : updates.dueDate,
      updated_at: now,
      last_updated_at: now,
    })
    .eq("id", id)
    .eq("project_id", existing.projectId)
    .select(
      "id, project_id, title, description, owner, owner_display_name, owner_user_id, status, due_date, created_at, updated_at, last_updated_at"
    )
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as DbRow) : null;
}

export async function deleteCommitment(userId: string, id: string): Promise<boolean> {
  requireSupabaseConfigured();
  const all = await fetchCommitments(userId);
  const existing = all.find((row) => row.id === id);
  if (!existing) return false;
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("commitments")
    .delete()
    .eq("id", id)
    .eq("project_id", existing.projectId);
  if (error) throw error;
  return true;
}

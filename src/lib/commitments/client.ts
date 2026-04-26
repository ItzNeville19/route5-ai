import type {
  Commitment,
  CommitmentCreatePayload,
  CommitmentStatus,
  CommitmentUpdatePayload,
} from "@/lib/commitments/types";

function normalize(row: {
  id: string;
  projectId?: string;
  project_id?: string;
  title: string;
  description: string | null;
  owner: string | null;
  status: CommitmentStatus;
  dueDate?: string | null;
  due_date?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}): Commitment {
  return {
    id: row.id,
    projectId: row.projectId ?? row.project_id ?? "",
    title: row.title,
    description: row.description,
    owner: row.owner,
    status: row.status,
    dueDate: row.dueDate ?? row.due_date ?? null,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? row.updated_at ?? new Date().toISOString(),
  };
}

export async function fetchCommitments(projectId?: string): Promise<Commitment[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/commitments${suffix}`, { credentials: "same-origin" });
  const data = (await res.json().catch(() => ({}))) as {
    commitments?: Commitment[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch commitments");
  return (data.commitments ?? []).map(normalize);
}

export async function createCommitment(payload: CommitmentCreatePayload): Promise<Commitment> {
  const res = await fetch("/api/commitments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      title: payload.title,
      description: payload.description ?? null,
      owner: payload.owner ?? null,
      due_date: payload.dueDate ?? null,
      project_id: payload.projectId,
      status: payload.status ?? "pending",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    commitment?: Commitment;
    error?: string;
  };
  if (!res.ok || !data.commitment) throw new Error(data.error ?? "Failed to create commitment");
  return normalize(data.commitment);
}

export async function updateCommitment(
  id: string,
  updates: CommitmentUpdatePayload
): Promise<Commitment> {
  const res = await fetch(`/api/commitments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      title: updates.title,
      description: updates.description,
      owner: updates.owner,
      due_date: updates.dueDate,
      status: updates.status,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    commitment?: Commitment;
    error?: string;
  };
  if (!res.ok || !data.commitment) throw new Error(data.error ?? "Failed to update commitment");
  return normalize(data.commitment);
}

export async function deleteCommitment(id: string): Promise<void> {
  const res = await fetch(`/api/commitments/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to delete commitment");
}

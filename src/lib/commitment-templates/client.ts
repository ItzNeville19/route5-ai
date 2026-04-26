export type CommitmentTemplate = {
  id: string;
  orgId: string | null;
  title: string;
  description: string | null;
  defaultOwner: string | null;
  dueDaysOffset: number;
  completionExpectations: string | null;
  source: "meeting" | "email" | "slack" | "manual";
  createdBy: string;
};

export async function fetchCommitmentTemplates(): Promise<CommitmentTemplate[]> {
  const res = await fetch("/api/commitment-templates", { credentials: "same-origin" });
  const data = (await res.json().catch(() => ({}))) as {
    templates?: CommitmentTemplate[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch templates");
  return data.templates ?? [];
}

export async function createCommitmentTemplate(
  payload: Omit<CommitmentTemplate, "id" | "orgId" | "createdBy">
): Promise<CommitmentTemplate> {
  const res = await fetch("/api/commitment-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      default_owner: payload.defaultOwner,
      due_days_offset: payload.dueDaysOffset,
      completion_expectations: payload.completionExpectations,
      source: payload.source,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    template?: CommitmentTemplate;
    error?: string;
  };
  if (!res.ok || !data.template) throw new Error(data.error ?? "Failed to create template");
  return data.template;
}

export async function updateCommitmentTemplate(
  id: string,
  payload: Partial<Omit<CommitmentTemplate, "id" | "orgId" | "createdBy">>
): Promise<CommitmentTemplate> {
  const res = await fetch(`/api/commitment-templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      default_owner: payload.defaultOwner,
      due_days_offset: payload.dueDaysOffset,
      completion_expectations: payload.completionExpectations,
      source: payload.source,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    template?: CommitmentTemplate;
    error?: string;
  };
  if (!res.ok || !data.template) throw new Error(data.error ?? "Failed to update template");
  return data.template;
}

export async function deleteCommitmentTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/commitment-templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to delete template");
}

export type CommitmentStatus = "pending" | "in_progress" | "done";

export type Commitment = {
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

export type CommitmentCreatePayload = {
  projectId: string;
  title: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  dueDate?: string | null;
};

export type CommitmentUpdatePayload = {
  title?: string;
  description?: string | null;
  owner?: string | null;
  status?: CommitmentStatus;
  dueDate?: string | null;
};

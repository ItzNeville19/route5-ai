"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createCommitment as createCommitmentRequest,
  deleteCommitment as deleteCommitmentRequest,
  fetchCommitments as fetchCommitmentsRequest,
  updateCommitment as updateCommitmentRequest,
} from "@/lib/commitments/client";
import {
  isActive,
  isAtRisk,
  isOverdue,
  isUnassigned,
  teamLoad,
} from "@/lib/commitments/derived-metrics";
import type {
  Commitment,
  CommitmentCreatePayload,
  CommitmentUpdatePayload,
} from "@/lib/commitments/types";

type CommitmentsContextValue = {
  commitments: Commitment[];
  filteredCommitments: Commitment[];
  loading: boolean;
  error: string | null;
  projectId: string | null;
  setProjectId: (projectId: string | null) => void;
  refresh: () => Promise<void>;
  createCommitment: (payload: CommitmentCreatePayload) => Promise<void>;
  updateCommitment: (id: string, updates: CommitmentUpdatePayload) => Promise<void>;
  deleteCommitment: (id: string) => Promise<void>;
  metrics: {
    active: number;
    overdue: number;
    atRisk: number;
    unassigned: number;
    teamLoad: Array<{ owner: string; activeCount: number }>;
  };
};

const CommitmentsContext = createContext<CommitmentsContextValue | null>(null);

export function useCommitments(): CommitmentsContextValue {
  const value = useContext(CommitmentsContext);
  if (!value) throw new Error("useCommitments must be used inside CommitmentsProvider");
  return value;
}

export function CommitmentsProvider({ children }: { children: React.ReactNode }) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchCommitmentsRequest(projectId ?? undefined);
      setCommitments(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load commitments");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCommitment = useCallback(
    async (payload: CommitmentCreatePayload) => {
      const created = await createCommitmentRequest(payload);
      setCommitments((prev) => [created, ...prev]);
      await refresh();
    },
    [refresh]
  );

  const updateCommitment = useCallback(async (id: string, updates: CommitmentUpdatePayload) => {
    const updated = await updateCommitmentRequest(id, updates);
    setCommitments((prev) => prev.map((row) => (row.id === id ? updated : row)));
    await refresh();
  }, [refresh]);

  const deleteCommitment = useCallback(async (id: string) => {
    await deleteCommitmentRequest(id);
    setCommitments((prev) => prev.filter((row) => row.id !== id));
    await refresh();
  }, [refresh]);

  const filteredCommitments = useMemo(() => {
    if (!projectId) return commitments;
    return commitments.filter((row) => row.projectId === projectId);
  }, [commitments, projectId]);

  const metrics = useMemo(() => {
    const rows = filteredCommitments;
    return {
      active: rows.filter(isActive).length,
      overdue: rows.filter(isOverdue).length,
      atRisk: rows.filter(isAtRisk).length,
      unassigned: rows.filter(isUnassigned).length,
      teamLoad: teamLoad(rows),
    };
  }, [filteredCommitments]);

  const value = useMemo(
    () => ({
      commitments,
      filteredCommitments,
      loading,
      error,
      projectId,
      setProjectId,
      refresh,
      createCommitment,
      updateCommitment,
      deleteCommitment,
      metrics,
    }),
    [
      commitments,
      filteredCommitments,
      loading,
      error,
      projectId,
      refresh,
      createCommitment,
      updateCommitment,
      deleteCommitment,
      metrics,
    ]
  );

  return (
    <CommitmentsContext.Provider value={value}>{children}</CommitmentsContext.Provider>
  );
}

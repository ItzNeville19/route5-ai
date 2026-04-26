"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useCommitments } from "@/components/commitments/CommitmentsProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { isAtRisk, isOverdue } from "@/lib/commitments/derived-metrics";
import type { Commitment, CommitmentStatus } from "@/lib/commitments/types";

type DeskFilter = "all" | "my_work" | "at_risk" | "overdue";

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromInputDate(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const STATUS_LABEL: Record<CommitmentStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

export default function CommitmentDesk() {
  const { user } = useUser();
  const { projects, loadingProjects } = useWorkspaceData();
  const {
    filteredCommitments,
    loading,
    error,
    projectId,
    setProjectId,
    createCommitment,
    updateCommitment,
    deleteCommitment,
  } = useCommitments();

  const [filter, setFilter] = useState<DeskFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<CommitmentStatus>("pending");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) return;
    if (projects[0]?.id) setProjectId(projects[0].id);
  }, [projectId, projects, setProjectId]);

  const rows = useMemo(() => {
    return filteredCommitments.filter((row) => {
      if (filter === "my_work") {
        const me = user?.fullName?.trim() || user?.firstName?.trim();
        return !!me && row.owner?.trim().toLowerCase() === me.toLowerCase();
      }
      if (filter === "at_risk") return isAtRisk(row);
      if (filter === "overdue") return isOverdue(row);
      return true;
    });
  }, [filteredCommitments, filter, user?.firstName, user?.fullName]);

  const selected: Commitment | null = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? rows[0] ?? null,
    [rows, selectedId]
  );

  useEffect(() => {
    if (selected?.id) setSelectedId(selected.id);
  }, [selected?.id]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setFormError("Title is required.");
      return;
    }
    if (!projectId) {
      setFormError("Pick a company first.");
      return;
    }
    await createCommitment({
      projectId,
      title: trimmed,
      description: description.trim() || null,
      owner: owner.trim() || null,
      dueDate: fromInputDate(dueDate),
      status,
    });
    setTitle("");
    setDescription("");
    setOwner("");
    setDueDate("");
    setStatus("pending");
  }

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,1400px)] flex-col gap-5 pb-12">
      <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-text-secondary">
          Desk
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-r5-text-primary">
          Commitments execution workspace
        </h1>
        <p className="mt-1 text-[13px] text-r5-text-secondary">
          Create, assign, update, and close commitments from one place.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">
              Company
            </p>
            <select
              className="mt-2 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value || null)}
              disabled={loadingProjects || projects.length === 0}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">
              Filters
            </p>
            <div className="mt-2 grid gap-1.5">
              {[
                { id: "all", label: "All" },
                { id: "my_work", label: "My Work" },
                { id: "at_risk", label: "At Risk" },
                { id: "overdue", label: "Overdue" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id as DeskFilter)}
                  className={`rounded-lg px-3 py-2 text-left text-[13px] ${
                    filter === option.id
                      ? "bg-r5-accent/15 text-r5-text-primary ring-1 ring-r5-accent/30"
                      : "text-r5-text-secondary hover:bg-r5-surface-hover"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-r5-border-subtle bg-r5-surface-primary">
          <div className="border-b border-r5-border-subtle px-4 py-3">
            <h2 className="text-[15px] font-semibold text-r5-text-primary">Commitments</h2>
            <p className="text-[12px] text-r5-text-secondary">
              {loading ? "Loading..." : `${rows.length} items`}
            </p>
            {error ? <p className="mt-1 text-[12px] text-red-500">{error}</p> : null}
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-r5-border-subtle px-4 py-8 text-center text-[13px] text-r5-text-secondary">
                No commitments in this filter.
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                      selected?.id === row.id
                        ? "border-r5-accent/35 bg-r5-accent/10"
                        : "border-r5-border-subtle hover:bg-r5-surface-hover"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium text-r5-text-primary">{row.title}</p>
                      <span className="rounded-full border border-r5-border-subtle px-2 py-0.5 text-[10px] text-r5-text-secondary">
                        {STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-r5-text-secondary">
                      {row.owner?.trim() || "Unassigned"} {row.dueDate ? `· Due ${new Date(row.dueDate).toLocaleDateString()}` : "· No due date"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <form
            onSubmit={onCreate}
            className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-4"
          >
            <h3 className="text-[14px] font-semibold text-r5-text-primary">Create commitment</h3>
            <input
              className="mt-2 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
              placeholder="Title (required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="mt-2 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
              placeholder="Description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
              placeholder="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
            <input
              type="datetime-local"
              className="mt-2 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <select
              className="mt-2 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as CommitmentStatus)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            {formError ? <p className="mt-2 text-[12px] text-red-500">{formError}</p> : null}
            <button
              type="submit"
              className="mt-3 w-full rounded-lg bg-r5-accent px-3 py-2 text-[13px] font-semibold text-white"
            >
              Create
            </button>
          </form>

          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-4">
            <h3 className="text-[14px] font-semibold text-r5-text-primary">Details</h3>
            {selected ? (
              <div className="mt-2 space-y-2">
                <input
                  className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
                  value={selected.title}
                  onChange={(e) => void updateCommitment(selected.id, { title: e.target.value })}
                />
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
                  value={selected.description ?? ""}
                  onChange={(e) =>
                    void updateCommitment(selected.id, { description: e.target.value || null })
                  }
                />
                <input
                  className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
                  value={selected.owner ?? ""}
                  placeholder="Owner"
                  onChange={(e) => void updateCommitment(selected.id, { owner: e.target.value || null })}
                />
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
                  value={toInputDate(selected.dueDate)}
                  onChange={(e) =>
                    void updateCommitment(selected.id, { dueDate: fromInputDate(e.target.value) })
                  }
                />
                <select
                  className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px]"
                  value={selected.status}
                  onChange={(e) =>
                    void updateCommitment(selected.id, {
                      status: e.target.value as CommitmentStatus,
                    })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                <button
                  type="button"
                  onClick={() => void deleteCommitment(selected.id)}
                  className="w-full rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] font-medium text-red-500"
                >
                  Delete commitment
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-r5-text-secondary">Select a commitment to edit.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

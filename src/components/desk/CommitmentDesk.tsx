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
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [detailOwner, setDetailOwner] = useState("");
  const [detailDueDate, setDetailDueDate] = useState("");
  const [detailStatus, setDetailStatus] = useState<CommitmentStatus>("pending");

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

  useEffect(() => {
    if (!selected) return;
    setDetailTitle(selected.title);
    setDetailDescription(selected.description ?? "");
    setDetailOwner(selected.owner ?? "");
    setDetailDueDate(toInputDate(selected.dueDate));
    setDetailStatus(selected.status);
  }, [selected]);

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
    try {
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
      setActionError(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create commitment.");
    }
  }

  async function saveDetails() {
    if (!selected) return;
    if (!detailTitle.trim()) {
      setActionError("Title is required.");
      return;
    }
    setSavingDetails(true);
    try {
      await updateCommitment(selected.id, {
        title: detailTitle.trim(),
        description: detailDescription.trim() || null,
        owner: detailOwner.trim() || null,
        dueDate: fromInputDate(detailDueDate),
        status: detailStatus,
      });
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save commitment.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;
    try {
      await deleteCommitment(selected.id);
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete commitment.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,1400px)] flex-col gap-6 pb-12">
      <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-5 shadow-[0_8px_30px_-22px_rgba(15,23,42,0.35)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-text-secondary">
          Desk
        </p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.01em] text-r5-text-primary">
          Commitments execution workspace
        </h1>
        <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-r5-text-secondary">
          Create, assign, and track commitments with immediate updates to ownership, status, and risk.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-3.5 shadow-[0_6px_18px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">
              Company
            </p>
            <select
              className="mt-2 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
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

          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-3.5 shadow-[0_6px_18px_-18px_rgba(15,23,42,0.45)]">
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
                  className={`rounded-xl border px-3 py-2 text-left text-[13px] font-medium ${
                    filter === option.id
                      ? "border-r5-border-subtle bg-r5-surface-secondary text-r5-text-primary"
                      : "border-transparent text-r5-text-secondary hover:border-r5-border-subtle hover:bg-r5-surface-hover"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-r5-border-subtle bg-r5-surface-primary shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]">
          <div className="border-b border-r5-border-subtle px-4 py-3.5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-r5-text-primary">Commitments</h2>
            <p className="text-[12px] text-r5-text-secondary">
              {loading ? "Loading..." : `${rows.length} items`}
            </p>
            {error ? <p className="mt-1 text-[12px] text-red-500">{error}</p> : null}
            {actionError ? <p className="mt-1 text-[12px] text-red-500">{actionError}</p> : null}
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-r5-border-subtle bg-r5-surface-secondary/55 px-4 py-10 text-center">
                <p className="text-[13px] font-medium text-r5-text-primary">No commitments in this view</p>
                <p className="mt-1 text-[12px] text-r5-text-secondary">
                  Create a commitment or switch filters to continue execution.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-[background-color,border-color,box-shadow] ${
                      selected?.id === row.id
                        ? "border-r5-border-subtle bg-r5-surface-secondary shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                        : "border-r5-border-subtle hover:bg-r5-surface-hover"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-r5-text-primary">{row.title}</p>
                      <span className="rounded-full border border-r5-border-subtle bg-r5-surface-primary px-2 py-0.5 text-[10px] font-medium text-r5-text-secondary">
                        {STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-r5-text-secondary">
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
            className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]"
          >
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-r5-text-primary">Create commitment</h3>
            <input
              className="mt-2 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
              placeholder="Title (required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="mt-2 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
              placeholder="Description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
              placeholder="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
            <input
              type="datetime-local"
              className="mt-2 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <select
              className="mt-2 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
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
              className="mt-3 w-full rounded-xl bg-r5-accent px-3 py-2 text-[13px] font-semibold text-white shadow-[0_8px_22px_-16px_rgba(59,130,246,0.7)]"
            >
              Create
            </button>
          </form>

          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-r5-text-primary">Details</h3>
            {selected ? (
              <div className="mt-2 space-y-2">
                <input
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailTitle}
                  onChange={(e) => setDetailTitle(e.target.value)}
                />
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailDescription}
                  onChange={(e) => setDetailDescription(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailOwner}
                  placeholder="Owner"
                  onChange={(e) => setDetailOwner(e.target.value)}
                />
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailDueDate}
                  onChange={(e) => setDetailDueDate(e.target.value)}
                />
                <select
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailStatus}
                  onChange={(e) => setDetailStatus(e.target.value as CommitmentStatus)}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => void saveDetails()}
                  className="w-full rounded-xl bg-r5-accent px-3 py-2 text-[13px] font-semibold text-white shadow-[0_8px_22px_-16px_rgba(59,130,246,0.7)] disabled:opacity-60"
                >
                  {savingDetails ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => void removeSelected()}
                  className="w-full rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-500/15"
                >
                  Delete commitment
                </button>
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-r5-border-subtle bg-r5-surface-secondary/55 px-4 py-8 text-center">
                <p className="text-[13px] font-medium text-r5-text-primary">Select a commitment</p>
                <p className="mt-1 text-[12px] text-r5-text-secondary">
                  Details and updates will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

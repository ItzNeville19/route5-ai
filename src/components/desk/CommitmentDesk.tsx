"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCommitments } from "@/components/commitments/CommitmentsProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { isAtRisk, isBlocked, isOverdue, isUnaccepted } from "@/lib/commitments/derived-metrics";
import type { Commitment, CommitmentSource, CommitmentStatus } from "@/lib/commitments/types";
import DeskGreetingBubble from "@/components/desk/DeskGreetingBubble";

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
  accepted: "Accepted",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  reopened: "Reopened",
};

export default function CommitmentDesk() {
  const searchParams = useSearchParams();
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
  const [source, setSource] = useState<CommitmentSource>("manual");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [detailOwner, setDetailOwner] = useState("");
  const [detailDueDate, setDetailDueDate] = useState("");
  const [detailStatus, setDetailStatus] = useState<CommitmentStatus>("pending");
  const [detailBlockerReason, setDetailBlockerReason] = useState("");
  const [detailCompletionNote, setDetailCompletionNote] = useState("");
  const [detailCompletionProofUrl, setDetailCompletionProofUrl] = useState("");
  const [requestDueDate, setRequestDueDate] = useState("");
  const [requestDueReason, setRequestDueReason] = useState("");
  const [managerComment, setManagerComment] = useState("");

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId) setSelectedId(focusId);
    const filterParam = searchParams.get("filter");
    if (filterParam === "all") setFilter("all");
    if (filterParam === "my_work") setFilter("my_work");
    if (filterParam === "at_risk" || filterParam === "unassigned") setFilter("at_risk");
    if (filterParam === "overdue") setFilter("overdue");
  }, [searchParams]);

  useEffect(() => {
    if (projectId) return;
    if (projects[0]?.id) setProjectId(projects[0].id);
  }, [projectId, projects, setProjectId]);

  const rows = useMemo(() => {
    return filteredCommitments.filter((row) => {
      if (filter === "my_work") {
        const owner = row.owner?.trim().toLowerCase() ?? "";
        if (!owner) return false;
        const me = [
          user?.fullName?.trim(),
          user?.firstName?.trim(),
          [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim(),
          user?.primaryEmailAddress?.emailAddress?.split("@")[0]?.trim(),
        ]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase());
        return me.some((value) => owner === value);
      }
      if (filter === "at_risk") return isAtRisk(row);
      if (filter === "overdue") return isOverdue(row);
      return true;
    });
  }, [filteredCommitments, filter, user?.firstName, user?.fullName, user?.lastName, user?.primaryEmailAddress?.emailAddress]);

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
    setDetailBlockerReason(selected.blockerReason ?? "");
    setDetailCompletionNote(selected.completion.note ?? "");
    setDetailCompletionProofUrl(selected.completion.proofUrl ?? "");
    setRequestDueDate(selected.dueDateRequest?.requestedDate ? toInputDate(selected.dueDateRequest.requestedDate) : "");
    setRequestDueReason(selected.dueDateRequest?.reason ?? "");
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
        source,
      });
      setTitle("");
      setDescription("");
      setOwner("");
      setDueDate("");
      setStatus("pending");
      setSource("manual");
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
    if (detailStatus === "blocked" && !detailBlockerReason.trim()) {
      setActionError("Blocked commitments require a blocker reason.");
      return;
    }
    if (detailStatus === "done" && !detailCompletionNote.trim() && !detailCompletionProofUrl.trim()) {
      setActionError("Completion requires a note or proof link.");
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
        blockerReason: detailStatus === "blocked" ? detailBlockerReason.trim() : null,
        completionNote: detailCompletionNote.trim() || null,
        completionProofUrl: detailCompletionProofUrl.trim() || null,
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

  async function acknowledgeSelected() {
    if (!selected) return;
    try {
      await updateCommitment(selected.id, { status: "accepted" });
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not acknowledge commitment.");
    }
  }

  async function requestDueDateChange() {
    if (!selected || !requestDueDate) {
      setActionError("Provide a requested due date.");
      return;
    }
    try {
      await updateCommitment(selected.id, {
        dueDateRequest: {
          requestedDate: fromInputDate(requestDueDate) ?? requestDueDate,
          reason: requestDueReason.trim() || null,
        },
      });
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not request due date change.");
    }
  }

  async function decideDueDateRequest(action: "approve" | "reject") {
    if (!selected) return;
    try {
      await updateCommitment(selected.id, {
        dueDateRequestDecision: {
          action,
          comment: managerComment.trim() || null,
        },
        ...(action === "approve" && selected.dueDateRequest?.requestedDate
          ? { dueDate: selected.dueDateRequest.requestedDate }
          : {}),
      });
      setManagerComment("");
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not review due date request.");
    }
  }

  async function approveCompletion() {
    if (!selected) return;
    try {
      await updateCommitment(selected.id, {
        managerDecision: "approve",
        managerComment: managerComment.trim() || null,
      });
      setManagerComment("");
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not approve completion.");
    }
  }

  async function reopenCommitment() {
    if (!selected) return;
    if (!managerComment.trim()) {
      setActionError("Reopen requires a manager comment.");
      return;
    }
    try {
      await updateCommitment(selected.id, {
        managerDecision: "reopen",
        managerComment: managerComment.trim(),
      });
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not reopen commitment.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,1400px)] flex-col gap-4 pb-10">
      <DeskGreetingBubble compact />
      <div className="relative overflow-hidden rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-4 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.35)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent"
          aria-hidden
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-text-secondary">
          Desk
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.01em] text-r5-text-primary">
          Commitments execution workspace
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-r5-text-secondary">
          Create, assign, and track commitments with immediate updates to ownership, status, and risk.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_340px]">
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
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-r5-text-secondary">
              <p>Owed: {rows.filter((row) => row.status !== "done").length}</p>
              <p>Blocked: {rows.filter(isBlocked).length}</p>
              <p>Overdue: {rows.filter(isOverdue).length}</p>
              <p>Needs ack: {rows.filter(isUnaccepted).length}</p>
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
                      {row.owner?.trim() || "Unassigned"} {row.dueDate ? `· Due ${new Date(row.dueDate).toLocaleDateString()}` : "· No due date"} · {row.source}
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
              <option value="accepted">Accepted</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="reopened">Reopened</option>
              <option value="done">Done</option>
            </select>
            <select
              className="mt-2 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
              value={source}
              onChange={(e) => setSource(e.target.value as CommitmentSource)}
            >
              <option value="manual">Manual</option>
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
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
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="reopened">Reopened</option>
                  <option value="done">Done</option>
                </select>
                {detailStatus === "blocked" ? (
                  <input
                    className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                    placeholder="Blocker reason (required)"
                    value={detailBlockerReason}
                    onChange={(e) => setDetailBlockerReason(e.target.value)}
                  />
                ) : null}
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  placeholder="Completion note"
                  value={detailCompletionNote}
                  onChange={(e) => setDetailCompletionNote(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  placeholder="Proof URL (optional)"
                  value={detailCompletionProofUrl}
                  onChange={(e) => setDetailCompletionProofUrl(e.target.value)}
                />
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => void saveDetails()}
                  className="w-full rounded-xl bg-r5-accent px-3 py-2 text-[13px] font-semibold text-white shadow-[0_8px_22px_-16px_rgba(59,130,246,0.7)] disabled:opacity-60"
                >
                  {savingDetails ? "Saving..." : "Save changes"}
                </button>
                {selected.status === "pending" || selected.status === "reopened" ? (
                  <button
                    type="button"
                    onClick={() => void acknowledgeSelected()}
                    className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] font-medium text-r5-text-primary hover:bg-r5-surface-hover"
                  >
                    Acknowledge ownership
                  </button>
                ) : null}
                <div className="rounded-xl border border-r5-border-subtle bg-r5-surface-secondary/45 p-2">
                  <p className="text-[11px] font-semibold text-r5-text-secondary">Due date request</p>
                  <input
                    type="datetime-local"
                    className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                    value={requestDueDate}
                    onChange={(e) => setRequestDueDate(e.target.value)}
                  />
                  <input
                    className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                    placeholder="Reason"
                    value={requestDueReason}
                    onChange={(e) => setRequestDueReason(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void requestDueDateChange()}
                    className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] font-medium text-r5-text-primary hover:bg-r5-surface-hover"
                  >
                    Request due date change
                  </button>
                  {selected.dueDateRequest?.status === "pending" ? (
                    <div className="mt-1.5 space-y-1.5">
                      <input
                        className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                        placeholder="Manager comment"
                        value={managerComment}
                        onChange={(e) => setManagerComment(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => void decideDueDateRequest("approve")}
                          className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-300 hover:bg-emerald-500/15"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void decideDueDateRequest("reject")}
                          className="rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[12px] font-medium text-red-300 hover:bg-red-500/15"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-xl border border-r5-border-subtle bg-r5-surface-secondary/45 p-2">
                  <p className="text-[11px] font-semibold text-r5-text-secondary">Manager verification</p>
                  <input
                    className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                    placeholder="Manager comment"
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                  />
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void approveCompletion()}
                      className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-300 hover:bg-emerald-500/15"
                    >
                      Approve done
                    </button>
                    <button
                      type="button"
                      onClick={() => void reopenCommitment()}
                      className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-[12px] font-medium text-amber-300 hover:bg-amber-500/15"
                    >
                      Reopen
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-r5-border-subtle bg-r5-surface-secondary/45 p-2">
                  <p className="text-[11px] font-semibold text-r5-text-secondary">Activity timeline</p>
                  {selected.activityTimeline.length === 0 ? (
                    <p className="mt-1.5 text-[12px] text-r5-text-secondary">No events yet.</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1.5">
                      {selected.activityTimeline.slice().reverse().map((event) => (
                        <li key={event.id} className="rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2 py-1.5">
                          <p className="text-[11px] font-medium text-r5-text-primary">
                            {event.type.replaceAll("_", " ")}
                          </p>
                          <p className="text-[10px] text-r5-text-secondary">
                            {new Date(event.at).toLocaleString()} {event.note ? `· ${event.note}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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

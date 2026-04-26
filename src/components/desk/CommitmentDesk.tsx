"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCommitments } from "@/components/commitments/CommitmentsProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { isAtRisk, isBlocked, isOverdue, isUnaccepted } from "@/lib/commitments/derived-metrics";
import type { Commitment, CommitmentSource, CommitmentStatus } from "@/lib/commitments/types";
import {
  createCommitmentTemplate,
  deleteCommitmentTemplate,
  fetchCommitmentTemplates,
  type CommitmentTemplate,
} from "@/lib/commitment-templates/client";
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
  const { projects, loadingProjects, orgRole } = useWorkspaceData();
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
  const [templates, setTemplates] = useState<CommitmentTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateOwner, setTemplateOwner] = useState("");
  const [templateDueOffset, setTemplateDueOffset] = useState(3);
  const [templateCompletionExpectations, setTemplateCompletionExpectations] = useState("");
  const [templateSource, setTemplateSource] = useState<CommitmentSource>("manual");

  const canAdmin = orgRole === "admin" || orgRole === "manager";
  const meLabels = useMemo(
    () =>
      [
        user?.fullName?.trim(),
        user?.firstName?.trim(),
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim(),
        user?.primaryEmailAddress?.emailAddress?.split("@")[0]?.trim(),
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase()),
    [user?.firstName, user?.fullName, user?.lastName, user?.primaryEmailAddress?.emailAddress]
  );

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
        return meLabels.some((value) => owner === value);
      }
      if (filter === "at_risk") return isAtRisk(row);
      if (filter === "overdue") return isOverdue(row);
      return true;
    });
  }, [filteredCommitments, filter, meLabels]);

  const selected: Commitment | null = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? rows[0] ?? null,
    [rows, selectedId]
  );
  const canEditSelected = selected
    ? canAdmin || meLabels.includes((selected.owner ?? "").trim().toLowerCase())
    : false;

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

  useEffect(() => {
    if (!canAdmin) return;
    void fetchCommitmentTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [canAdmin]);

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

  function applyTemplate() {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description ?? "");
    setOwner(template.defaultOwner ?? "");
    setSource(template.source);
    const due = new Date(Date.now() + template.dueDaysOffset * 24 * 60 * 60 * 1000);
    setDueDate(toInputDate(due.toISOString()));
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

  async function saveTemplate() {
    if (!templateTitle.trim()) {
      setActionError("Template title is required.");
      return;
    }
    try {
      const created = await createCommitmentTemplate({
        title: templateTitle.trim(),
        description: templateDescription.trim() || null,
        defaultOwner: templateOwner.trim() || null,
        dueDaysOffset: templateDueOffset,
        completionExpectations: templateCompletionExpectations.trim() || null,
        source: templateSource,
      });
      setTemplates((prev) => [created, ...prev]);
      setTemplateTitle("");
      setTemplateDescription("");
      setTemplateOwner("");
      setTemplateDueOffset(3);
      setTemplateCompletionExpectations("");
      setTemplateSource("manual");
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save template.");
    }
  }

  async function removeTemplate(id: string) {
    try {
      await deleteCommitmentTemplate(id);
      setTemplates((prev) => prev.filter((item) => item.id !== id));
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete template.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,1400px)] flex-col gap-3 pb-8">
      <DeskGreetingBubble compact />
      <div className="relative overflow-hidden rounded-2xl border border-r5-border-subtle bg-r5-surface-primary px-4 py-3 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.35)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent"
          aria-hidden
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-text-secondary">
          Desk
        </p>
        <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-r5-text-primary">
          Accountability Desk
        </h1>
        <p className="mt-1 max-w-[70ch] text-[12px] leading-relaxed text-r5-text-secondary">
          Assign clearly, acknowledge ownership, enforce follow-through, and verify completion.
        </p>
        <p className="mt-1 text-[11px] text-r5-text-tertiary">
          Role: {orgRole ?? "member"} {canAdmin ? "· admin controls enabled" : "· execution controls only"}
        </p>
        {canAdmin ? (
          <div className="mt-2">
            <Link
              href="/workspace/organization"
              className="inline-flex rounded-full border border-r5-border-subtle bg-r5-surface-secondary px-3 py-1.5 text-[11px] font-medium text-r5-text-primary hover:bg-r5-surface-hover"
            >
              Organization & members
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2.5 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
        <aside className="space-y-2.5">
          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-2.5 shadow-[0_6px_18px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">
              Company
            </p>
            <select
              className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
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

          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-2.5 shadow-[0_6px_18px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">
              Filters
            </p>
            <div className="mt-1.5 grid gap-1">
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
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium ${
                    filter === option.id
                      ? "border-r5-border-subtle bg-r5-surface-secondary text-r5-text-primary"
                      : "border-transparent text-r5-text-secondary hover:border-r5-border-subtle hover:bg-r5-surface-hover"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-r5-text-secondary">
              <p>Owed: {rows.filter((row) => row.status !== "done").length}</p>
              <p>Blocked: {rows.filter(isBlocked).length}</p>
              <p>Overdue: {rows.filter(isOverdue).length}</p>
              <p>Needs ack: {rows.filter(isUnaccepted).length}</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-r5-border-subtle bg-r5-surface-primary shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]">
          <div className="border-b border-r5-border-subtle px-3.5 py-2.5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-r5-text-primary">Commitments</h2>
            <p className="text-[12px] text-r5-text-secondary">
              {loading ? "Loading..." : `${rows.length} items`}
            </p>
            {error ? <p className="mt-1 text-[12px] text-red-500">{error}</p> : null}
            {actionError ? <p className="mt-1 text-[12px] text-red-500">{actionError}</p> : null}
          </div>
          <div className="max-h-[72vh] overflow-y-auto p-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-r5-border-subtle bg-r5-surface-secondary/55 px-4 py-10 text-center">
                <p className="text-[13px] font-medium text-r5-text-primary">No commitments in this view</p>
                <p className="mt-1 text-[12px] text-r5-text-secondary">
                  Create a commitment or switch filters to continue execution.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-[background-color,border-color,box-shadow] ${
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

        <section className="space-y-2.5">
          {canAdmin ? (
          <form
            onSubmit={onCreate}
            className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]"
          >
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-r5-text-primary">Create commitment</h3>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
              <select
                className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Use template (optional)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyTemplate}
                className="rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] font-medium text-r5-text-primary hover:bg-r5-surface-hover"
              >
                Apply
              </button>
            </div>
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
              className="mt-2.5 w-full rounded-lg bg-r5-accent px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_22px_-16px_rgba(59,130,246,0.7)]"
            >
              Create
            </button>
          </form>
          ) : null}

          {canAdmin ? (
            <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]">
              <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-r5-text-primary">Templates</h3>
              <input
                className="mt-2 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                placeholder="Template title"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
              />
              <textarea
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                placeholder="Template description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <input
                  className="rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  placeholder="Default owner"
                  value={templateOwner}
                  onChange={(e) => setTemplateOwner(e.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  max={365}
                  className="rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={templateDueOffset}
                  onChange={(e) => setTemplateDueOffset(Number(e.target.value || 0))}
                />
              </div>
              <input
                className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                placeholder="Completion expectations"
                value={templateCompletionExpectations}
                onChange={(e) => setTemplateCompletionExpectations(e.target.value)}
              />
              <select
                className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                value={templateSource}
                onChange={(e) => setTemplateSource(e.target.value as CommitmentSource)}
              >
                <option value="manual">Manual</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
              </select>
              <button
                type="button"
                onClick={() => void saveTemplate()}
                className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 py-1.5 text-[12px] font-medium text-r5-text-primary hover:bg-r5-surface-hover"
              >
                Save template
              </button>
              <ul className="mt-2 space-y-1">
                {templates.slice(0, 6).map((template) => (
                  <li
                    key={template.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-r5-border-subtle bg-r5-surface-secondary/45 px-2 py-1.5"
                  >
                    <p className="truncate text-[11px] text-r5-text-primary">{template.title}</p>
                    {template.orgId ? (
                      <button
                        type="button"
                        onClick={() => void removeTemplate(template.id)}
                        className="rounded-md border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/15"
                      >
                        Delete
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-r5-text-primary">Details</h3>
            {selected ? (
              <div className="mt-2 space-y-2">
                <input
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailTitle}
                  onChange={(e) => setDetailTitle(e.target.value)}
                  disabled={!canEditSelected}
                />
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailDescription}
                  onChange={(e) => setDetailDescription(e.target.value)}
                  disabled={!canEditSelected}
                />
                <input
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailOwner}
                  placeholder="Owner"
                  onChange={(e) => setDetailOwner(e.target.value)}
                  disabled={!canAdmin}
                />
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailDueDate}
                  onChange={(e) => setDetailDueDate(e.target.value)}
                  disabled={!canEditSelected}
                />
                <select
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  value={detailStatus}
                  onChange={(e) => setDetailStatus(e.target.value as CommitmentStatus)}
                  disabled={!canEditSelected}
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
                    disabled={!canEditSelected}
                  />
                ) : null}
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  placeholder="Completion note"
                  value={detailCompletionNote}
                  onChange={(e) => setDetailCompletionNote(e.target.value)}
                  disabled={!canEditSelected}
                />
                <input
                  className="w-full rounded-xl border border-r5-border-subtle bg-r5-surface-secondary px-3 py-2 text-[13px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                  placeholder="Proof URL (optional)"
                  value={detailCompletionProofUrl}
                  onChange={(e) => setDetailCompletionProofUrl(e.target.value)}
                  disabled={!canEditSelected}
                />
                {canEditSelected ? (
                  <button
                    type="button"
                    disabled={savingDetails}
                    onClick={() => void saveDetails()}
                    className="w-full rounded-xl bg-r5-accent px-3 py-2 text-[13px] font-semibold text-white shadow-[0_8px_22px_-16px_rgba(59,130,246,0.7)] disabled:opacity-60"
                  >
                    {savingDetails ? "Saving..." : "Save changes"}
                  </button>
                ) : null}
                {selected.status === "pending" || selected.status === "reopened" ? (
                  <button
                    type="button"
                    onClick={() => void acknowledgeSelected()}
                    disabled={!canEditSelected}
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
                    disabled={!canEditSelected}
                  />
                  <input
                    className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] text-r5-text-primary focus:border-r5-accent/50 focus:outline-none"
                    placeholder="Reason"
                    value={requestDueReason}
                    onChange={(e) => setRequestDueReason(e.target.value)}
                    disabled={!canEditSelected}
                  />
                  <button
                    type="button"
                    onClick={() => void requestDueDateChange()}
                    disabled={!canEditSelected}
                    className="mt-1.5 w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] font-medium text-r5-text-primary hover:bg-r5-surface-hover"
                  >
                    Request due date change
                  </button>
                  {selected.dueDateRequest?.status === "pending" && canAdmin ? (
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
                {canAdmin ? (
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
                ) : null}
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
                  disabled={!canAdmin}
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { nanoid } from "nanoid";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleUser,
  Clock,
  LayoutGrid,
  Loader2,
  Mail,
  MessageSquare,
  PenLine,
  Plus,
  Sparkles,
  Target,
  User,
  UserX,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  Commitment,
  CommitmentSource,
  CommitmentStatus,
  ExecutionOverview,
} from "@/lib/commitment-types";
import type { ExtractedCommitmentDraft } from "@/lib/extract-commitments";
import { NativeDateInput } from "@/components/ui/native-datetime-fields";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { deskUrl } from "@/lib/desk-routes";
import { formatRelativeLong } from "@/lib/relative-time";
import { STATUS_ACCENT, STATUS_LABEL, STATUS_PILL } from "@/components/desk/desk-constants";

const SOURCE_LABEL: Record<CommitmentSource, string> = {
  meeting: "Meeting",
  slack: "Slack",
  email: "Email",
  manual: "Manual",
};

const SOURCE_ICON: Record<CommitmentSource, LucideIcon> = {
  meeting: Video,
  slack: MessageSquare,
  email: Mail,
  manual: PenLine,
};

const STATUSES: CommitmentStatus[] = ["active", "at_risk", "overdue", "completed"];

type DeskFilter = "all" | "my" | "at_risk" | "overdue" | "unassigned";

const FILTER_DEF: { id: DeskFilter; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "my", label: "Mine", icon: User },
  { id: "at_risk", label: "At risk", icon: AlertOctagon },
  { id: "overdue", label: "Overdue", icon: Clock },
  { id: "unassigned", label: "No owner", icon: UserX },
];

function parseDeskFilterFromSearchParams(sp: { get: (key: string) => string | null }): DeskFilter {
  const raw = sp.get("filter");
  if (!raw) return "all";
  const normalized = raw === "mine" ? "my" : raw;
  if (
    normalized === "all" ||
    normalized === "my" ||
    normalized === "at_risk" ||
    normalized === "overdue" ||
    normalized === "unassigned"
  ) {
    return normalized;
  }
  return "all";
}

/** Same query shape as {@link deskUrl}, plus optional `filter` for deep links / email CTAs. */
function deskHrefWithFilter(projectId: string, filter: DeskFilter): string {
  const base = deskUrl({ projectId });
  const u = new URL(base, "https://route5.local");
  if (filter !== "all") u.searchParams.set("filter", filter);
  else u.searchParams.delete("filter");
  return `${u.pathname}${u.search}`;
}

/** Avoid router/replace loops when query-param ordering differs. */
function pathAndQueryEquivalent(a: string, b: string): boolean {
  const [pa, qa] = a.split("?");
  const [pb, qb] = b.split("?");
  if (pa !== pb) return false;
  const spa = new URLSearchParams(qa ?? "");
  const spb = new URLSearchParams(qb ?? "");
  const keys = new Set([...spa.keys(), ...spb.keys()]);
  for (const k of keys) {
    const av = [...spa.getAll(k)].sort().join("\0");
    const bv = [...spb.getAll(k)].sort().join("\0");
    if (av !== bv) return false;
  }
  return true;
}

export default function CommitmentDesk() {
  const { user } = useUser();
  const { pushToast } = useWorkspaceExperience();
  const { projects, loadingProjects, refreshAll } = useWorkspaceData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projectId, setProjectId] = useState("");
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputOpen, setInputOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [captureStep, setCaptureStep] = useState<"paste" | "review">("paste");
  type ProposedRow = ExtractedCommitmentDraft & { key: string };
  const [proposedRows, setProposedRows] = useState<ProposedRow[]>([]);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [intel, setIntel] = useState<ExecutionOverview | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  const [detailNote, setDetailNote] = useState("");
  const [saving, setSaving] = useState(false);

  const filter = useMemo(
    () => parseDeskFilterFromSearchParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome !== "joined-org") return;
    pushToast(
      "Welcome to your organization. Shared projects and commitments are now available.",
      "success"
    );
    try {
      const next = new URL(window.location.href);
      next.searchParams.delete("welcome");
      window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
    } catch {
      /* ignore */
    }
  }, [searchParams, pushToast]);

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid && projects.some((p) => p.id === pid)) {
      setProjectId(pid);
      return;
    }
    setProjectId((prev) => {
      if (prev && projects.some((p) => p.id === prev)) return prev;
      return projects[0]?.id ?? "";
    });
  }, [searchParams, projects]);

  useEffect(() => {
    if (!projectId) return;
    const f = parseDeskFilterFromSearchParams(searchParams);
    const target = deskHrefWithFilter(projectId, f);
    if (typeof window === "undefined") return;
    const cur = `${window.location.pathname}${window.location.search}`;
    if (pathAndQueryEquivalent(cur, target)) return;
    router.replace(target, { scroll: false });
  }, [projectId, searchParams, router]);

  const loadCommitments = useCallback(async () => {
    if (!projectId) return;
    setLoadingList(true);
    try {
      const q = filter === "all" ? "" : `?filter=${encodeURIComponent(filter)}`;
      const res = await fetch(`/api/projects/${projectId}/commitments${q}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { commitments?: Commitment[] };
      if (!res.ok) {
        setCommitments([]);
        return;
      }
      setCommitments(data.commitments ?? []);
    } finally {
      setLoadingList(false);
    }
  }, [projectId, filter]);

  useEffect(() => {
    void loadCommitments();
  }, [loadCommitments]);

  useEffect(() => {
    let cancelled = false;
    setLoadingIntel(true);
    void fetch("/api/workspace/execution", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { overview?: ExecutionOverview } | null) => {
        if (!cancelled && data?.overview) setIntel(data.overview);
      })
      .finally(() => {
        if (!cancelled) setLoadingIntel(false);
      });
    return () => {
      cancelled = true;
    };
  }, [commitments.length]);

  const selected = useMemo(
    () => commitments.find((c) => c.id === selectedId) ?? null,
    [commitments, selectedId]
  );

  useEffect(() => {
    setDetailNote("");
  }, [selectedId]);

  useEffect(() => {
    if (inputOpen) {
      setCaptureStep("paste");
      setProposedRows([]);
    }
  }, [inputOpen]);

  async function runPropose(e: React.FormEvent) {
    e.preventDefault();
    const raw = inputText.trim();
    if (!projectId || !raw) {
      pushToast("Choose a project and paste text.", "error");
      return;
    }
    setCaptureBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          extractFrom: raw,
          preview: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        drafts?: ExtractedCommitmentDraft[];
        error?: string;
      };
      if (!res.ok) {
        pushToast(data.error ?? "Could not propose commitments.", "error");
        return;
      }
      const drafts = data.drafts ?? [];
      if (drafts.length === 0) {
        pushToast("No commitments found — try bullets, numbered lines, or TODO: items.", "error");
        return;
      }
      setProposedRows(
        drafts.map((d) => ({
          ...d,
          key: nanoid(),
          ownerUserId: d.ownerUserId ?? null,
        }))
      );
      setCaptureStep("review");
      pushToast(`${drafts.length} commitment(s) ready — assign owners and commit.`, "success");
    } finally {
      setCaptureBusy(false);
    }
  }

  async function runCommit() {
    if (!projectId || proposedRows.length === 0) return;
    const commitDrafts = proposedRows.map((draft) => {
      const { key, ...d } = draft;
      void key;
      return {
        title: d.title.trim(),
        description: d.description ?? null,
        ownerName: d.ownerName?.trim() || null,
        ownerUserId: d.ownerUserId?.trim() || null,
        source: d.source,
        sourceReference: d.sourceReference,
        priority: d.priority,
        dueDate: d.dueDate?.trim() || null,
      };
    });
    if (commitDrafts.some((r) => !r.title)) {
      pushToast("Every row needs a title.", "error");
      return;
    }
    setCaptureBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ commitDrafts }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        commitments?: Commitment[];
        error?: string;
      };
      if (!res.ok) {
        pushToast(data.error ?? "Could not save commitments.", "error");
        return;
      }
      const n = data.commitments?.length ?? 0;
      pushToast(n ? `Committed ${n} — owners are notified when assigned.` : "Nothing saved.", "success");
      setInputText("");
      setInputOpen(false);
      setCaptureStep("paste");
      setProposedRows([]);
      await loadCommitments();
      await refreshAll();
      if (data.commitments?.[0]) setSelectedId(data.commitments[0].id);
    } finally {
      setCaptureBusy(false);
    }
  }

  function updateProposedRow(key: string, patch: Partial<ExtractedCommitmentDraft>) {
    setProposedRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeProposedRow(key: string) {
    setProposedRows((rows) => rows.filter((r) => r.key !== key));
  }

  function assignRowToMe(key: string) {
    if (!user?.id) {
      pushToast("Sign in to assign to yourself.", "error");
      return;
    }
    updateProposedRow(key, {
      ownerUserId: user.id,
      ownerName: user.fullName ?? user.firstName ?? user.primaryEmailAddress?.emailAddress ?? "You",
    });
  }

  async function patchCommitmentById(id: string, partial: Record<string, unknown>) {
    if (!projectId) return null;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/commitments/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(partial),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        commitment?: Commitment;
        error?: string;
      };
      if (!res.ok || !data.commitment) {
        pushToast(data.error ?? "Could not save.", "error");
        return null;
      }
      setCommitments((prev) =>
        prev.map((c) => (c.id === data.commitment!.id ? data.commitment! : c))
      );
      await refreshAll();
      return data.commitment;
    } catch {
      pushToast("Could not save.", "error");
      return null;
    }
  }

  async function patchCommitment(partial: Record<string, unknown>) {
    if (!selected) return;
    setSaving(true);
    try {
      await patchCommitmentById(selected.id, partial);
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    const note = detailNote.trim();
    if (!note) return;
    await patchCommitment({ note });
    setDetailNote("");
  }

  async function completeVisibleCommitments() {
    const todo = commitments.filter((c) => c.status !== "completed");
    if (todo.length === 0) {
      pushToast("Everything in this view is already completed.", "info");
      return;
    }
    setSaving(true);
    try {
      for (const row of todo) {
        await patchCommitmentById(row.id, { status: "completed" });
      }
      pushToast(`Marked ${todo.length} commitment${todo.length === 1 ? "" : "s"} complete.`, "success");
    } finally {
      setSaving(false);
    }
  }

  const unassignedCount = useMemo(
    () => intel?.riskFeed.filter((r) => r.riskReason === "unassigned").length ?? 0,
    [intel]
  );

  const wordCount = useMemo(
    () => inputText.trim().split(/\s+/).filter(Boolean).length,
    [inputText]
  );

  const teamLoadMax = useMemo(() => {
    if (!intel?.teamLoad.length) return 1;
    return Math.max(1, ...intel.teamLoad.map((t) => t.activeCount));
  }, [intel]);

  const currentProject = projects.find((p) => p.id === projectId);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1680px] flex-col gap-5 pb-20">
      {/* Workspace execution strip */}
      <section className="relative overflow-hidden rounded-[22px] border border-[var(--workspace-border)] bg-gradient-to-br from-[var(--workspace-surface)]/90 via-[var(--workspace-canvas)]/95 to-sky-950/20 p-1 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(56,189,248,0.12),transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col gap-4 rounded-[18px] border border-white/5 bg-[var(--workspace-canvas)]/40 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
                Desk · execution surface
              </p>
              <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[22px]">
                Own commitments, not chat logs
              </h1>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                Paste notes, propose owned commitments, commit once — accountability, not summaries. Counts below
                are workspace-wide.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setInputOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--workspace-fg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-lg shadow-black/20 transition hover:opacity-95"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Add decision
              </button>
              <Link
                href="/overview"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)]"
              >
                Overview
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {loadingIntel ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-[88px] animate-pulse rounded-2xl bg-[var(--workspace-border)]/30"
                  />
                ))}
              </>
            ) : intel ? (
              <>
                <StatChip
                  label="Active"
                  value={intel.summary.activeTotal}
                  sub="open"
                  tone="sky"
                />
                <StatChip
                  label="Overdue"
                  value={intel.summary.overdueCount}
                  sub="past due"
                  tone="red"
                  pulse={intel.summary.overdueCount > 0}
                />
                <StatChip
                  label="At risk"
                  value={intel.summary.atRiskCount}
                  sub="stale / flagged"
                  tone="amber"
                  pulse={intel.summary.atRiskCount > 0}
                />
                <StatChip
                  label="Unassigned"
                  value={intel.summary.unassignedCount}
                  sub="no owner"
                  tone="violet"
                  pulse={intel.summary.unassignedCount > 0}
                />
                <StatChip
                  label="Week closed"
                  value={`${Math.round(intel.summary.pctCompletedThisWeek)}%`}
                  sub="completed (7d)"
                  tone="emerald"
                />
              </>
            ) : (
              <p className="col-span-full text-[13px] text-[var(--workspace-muted-fg)]">
                Execution data unavailable.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Left rail */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[268px]">
          <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/75 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
              Project
            </p>
            {loadingProjects ? (
              <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
            ) : projects.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                No projects yet — create one from Overview.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {projects.map((p) => {
                  const active = projectId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setProjectId(p.id)}
                        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                          active
                            ? "border-[var(--workspace-accent)]/40 bg-[var(--workspace-nav-active)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                            : "border-transparent bg-[var(--workspace-surface)]/40 hover:border-[var(--workspace-border)] hover:bg-[var(--workspace-nav-hover)]"
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--workspace-border)]/40 text-lg">
                          {p.iconEmoji ?? "◆"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-[var(--workspace-fg)]">
                            {p.name}
                          </span>
                          {active && currentProject ? (
                            <span className="mt-0.5 block text-[11px] text-[var(--workspace-muted-fg)]">
                              Editing commitments
                            </span>
                          ) : null}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-60 ${
                            active ? "opacity-80" : ""
                          }`}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/75 p-3 shadow-sm backdrop-blur-sm">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
              View
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FILTER_DEF.map(({ id, label, icon: Icon }) => {
                const on = filter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (!projectId) return;
                      router.replace(deskHrefWithFilter(projectId, id), { scroll: false });
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      on
                        ? "border-[var(--workspace-accent)]/45 bg-[var(--workspace-nav-active)] text-[var(--workspace-fg)] shadow-sm"
                        : "border-[var(--workspace-border)]/60 bg-[var(--workspace-surface)]/30 text-[var(--workspace-muted-fg)] hover:border-[var(--workspace-accent)]/25 hover:text-[var(--workspace-fg)]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-90" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center + detail */}
        <main className="min-w-0 flex-1 overflow-hidden rounded-[22px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex min-h-[520px] flex-col xl:flex-row">
            {/* List */}
            <div className="flex min-h-[360px] flex-1 flex-col border-[var(--workspace-border)] xl:w-[min(52%,640px)] xl:border-r">
              <div className="flex items-end justify-between gap-3 border-b border-[var(--workspace-border)]/90 px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Commitments</h2>
                  <p className="mt-0.5 text-[12px] text-[var(--workspace-muted-fg)]">
                    {currentProject ? (
                      <>
                        <span className="font-medium text-[var(--workspace-fg)]/90">{currentProject.name}</span>
                        {" · "}
                      </>
                    ) : null}
                    {loadingList ? "Loading…" : `${commitments.length} in this view`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving || loadingList || commitments.length === 0}
                  onClick={() => void completeVisibleCommitments()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/30 hover:bg-[var(--workspace-nav-hover)] disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Checkmark all
                </button>
              </div>
              <div className="max-h-[min(68vh,760px)] space-y-2.5 overflow-y-auto p-3 sm:p-4">
                {!projectId ? (
                  <EmptyState title="Pick a project" body="Select a workspace project to load commitments." />
                ) : loadingList ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-[var(--workspace-accent)]" />
                  </div>
                ) : commitments.length === 0 ? (
                  <EmptyState
                    title="Nothing in this filter"
                    body="Try another view or add a decision from Desk — propose commitments from notes, then commit."
                    action={
                      <button
                        type="button"
                        onClick={() => setInputOpen(true)}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add decision
                      </button>
                    }
                  />
                ) : (
                  commitments.map((c) => {
                    const SourceIcon = SOURCE_ICON[c.source];
                    const sel = selectedId === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        type="button"
                        layout
                        onClick={() => setSelectedId(c.id)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.995 }}
                        className={`w-full rounded-2xl border border-l-4 px-3.5 py-3 text-left shadow-sm transition ${STATUS_ACCENT[c.status]} ${
                          sel
                            ? "border-[var(--workspace-accent)]/50 bg-[var(--workspace-surface)]/95 ring-1 ring-[var(--workspace-accent)]/25"
                            : "border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/45 hover:border-[var(--workspace-accent)]/30 hover:bg-[var(--workspace-surface)]/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold leading-snug text-[var(--workspace-fg)]">
                            {c.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_PILL[c.status]}`}
                          >
                            {STATUS_LABEL[c.status]}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--workspace-muted-fg)]">
                          <span className="inline-flex items-center gap-1">
                            <CircleUser className="h-3.5 w-3.5" aria-hidden />
                            {c.ownerDisplayName?.trim() ||
                              (c.ownerUserId === user?.id ? "You" : null) ||
                              "Unassigned"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--workspace-border)]/50 px-1.5 py-0.5 text-[10px] font-medium text-[var(--workspace-fg)]/90">
                            <SourceIcon className="h-3 w-3 opacity-80" aria-hidden />
                            {SOURCE_LABEL[c.source]}
                          </span>
                          {c.dueDate ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden />
                              Due {formatRelativeLong(c.dueDate, "en")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
                          {c.activityLog[0]?.body
                            ? `Last: ${c.activityLog[0].body}`
                            : `Updated ${formatRelativeLong(c.lastUpdatedAt, "en")}`}
                        </p>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail */}
            <div className="flex min-h-[320px] flex-1 flex-col border-t border-[var(--workspace-border)] xl:border-t-0">
              <div className="border-b border-[var(--workspace-border)]/90 px-4 py-3 sm:px-5">
                <h3 className="text-[14px] font-semibold text-[var(--workspace-fg)]">Inspector</h3>
                <p className="text-[11px] text-[var(--workspace-muted-fg)]">
                  Status, ownership, and audit trail
                </p>
              </div>
              {selected ? (
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
                  <div className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      Description
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-fg)]/95">
                      {selected.description?.trim() || "No description yet."}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      Status
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => {
                        const on = selected.status === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={saving}
                            onClick={() => void patchCommitment({ status: s })}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                              on
                                ? `${STATUS_PILL[s]} ring-1 ring-white/10`
                                : "border-[var(--workspace-border)]/70 bg-[var(--workspace-surface)]/30 text-[var(--workspace-muted-fg)] hover:border-[var(--workspace-accent)]/30 hover:text-[var(--workspace-fg)]"
                            }`}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                      Owner ID (advanced)
                      <input
                        className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 font-mono text-[11px] text-[var(--workspace-fg)]"
                        value={selected.ownerUserId ?? ""}
                        placeholder="Leave empty for unassigned"
                        onChange={(e) =>
                          setCommitments((prev) =>
                            prev.map((c) =>
                              c.id === selected.id ? { ...c, ownerUserId: e.target.value || null } : c
                            )
                          )
                        }
                        onBlur={(e) =>
                          void patchCommitment({
                            ownerUserId: e.target.value.trim() || null,
                          })
                        }
                      />
                    </label>
                    <label className="block text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                      Owner label
                      <input
                        className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                        value={selected.ownerDisplayName ?? ""}
                        onChange={(e) =>
                          setCommitments((prev) =>
                            prev.map((c) =>
                              c.id === selected.id
                                ? { ...c, ownerDisplayName: e.target.value || null }
                                : c
                            )
                          )
                        }
                        onBlur={(e) =>
                          void patchCommitment({
                            ownerDisplayName: e.target.value.trim() || null,
                          })
                        }
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--workspace-accent)]/35 bg-[var(--workspace-accent)]/10 px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-accent)]/20"
                    onClick={() =>
                      void patchCommitment({
                        ownerUserId: user?.id ?? null,
                        ownerDisplayName: user?.fullName ?? user?.firstName ?? "You",
                      })
                    }
                  >
                    <User className="h-3.5 w-3.5" aria-hidden />
                    Assign to me
                  </button>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      Activity
                    </p>
                    <ul className="relative mt-3 space-y-0 border-l border-[var(--workspace-border)] pl-4">
                      {selected.activityLog.map((e) => (
                        <li key={e.id} className="relative pb-4 last:pb-0">
                          <span className="absolute -left-[21px] top-1.5 flex h-2.5 w-2.5 rounded-full border-2 border-[var(--workspace-canvas)] bg-[var(--workspace-accent)]" />
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                            {formatRelativeLong(e.at, "en")} · {e.kind}
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed text-[var(--workspace-fg)]">{e.body}</p>
                        </li>
                      ))}
                      {selected.activityLog.length === 0 ? (
                        <li className="text-[12px] text-[var(--workspace-muted-fg)]">No events yet.</li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/30 p-4">
                    <label className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                      Add note
                    </label>
                    <textarea
                      value={detailNote}
                      onChange={(e) => setDetailNote(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                    />
                    <button
                      type="button"
                      disabled={saving || !detailNote.trim()}
                      onClick={() => void addNote()}
                      className="mt-3 rounded-full bg-[var(--workspace-accent)] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
                    >
                      Append note
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                  <Target className="h-10 w-10 text-[var(--workspace-border)]" aria-hidden />
                  <p className="max-w-xs text-[13px] text-[var(--workspace-muted-fg)]">
                    Select a commitment to update status, owner, and notes. Your changes sync to Overview and
                    digest.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right intelligence */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[300px]">
          <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200">
                <Target className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--workspace-fg)]">Execution intelligence</p>
                <p className="text-[11px] text-[var(--workspace-muted-fg)]">Workspace signals</p>
              </div>
            </div>
            {loadingIntel ? (
              <p className="mt-4 text-[12px] text-[var(--workspace-muted-fg)]">Loading…</p>
            ) : intel ? (
              <ul className="mt-4 space-y-3 text-[12px]">
                <li className="flex items-center justify-between rounded-xl bg-[var(--workspace-surface)]/40 px-3 py-2">
                  <span className="text-[var(--workspace-muted-fg)]">Overloaded (&gt;8 active)</span>
                  <span className="font-semibold tabular-nums text-[var(--workspace-fg)]">
                    {intel.teamLoad.filter((t) => t.overloaded).length || "0"}
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-[var(--workspace-surface)]/40 px-3 py-2">
                  <span className="text-[var(--workspace-muted-fg)]">Unassigned (risk feed)</span>
                  <span className="font-semibold tabular-nums text-amber-200">{unassignedCount}</span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-[var(--workspace-surface)]/40 px-3 py-2">
                  <span className="text-[var(--workspace-muted-fg)]">Deadline conflicts</span>
                  <span className="font-semibold tabular-nums text-[var(--workspace-fg)]">
                    {intel.conflictingDeadlines.length}
                  </span>
                </li>
              </ul>
            ) : (
              <p className="mt-4 text-[12px] text-[var(--workspace-muted-fg)]">No data.</p>
            )}
          </div>

          {intel && intel.recentActivity.length > 0 ? (
            <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
                  Recent motion
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {intel.recentActivity.slice(0, 5).map((a, i) => (
                  <li key={`${a.commitmentId}-${i}`}>
                    <Link
                      href={deskUrl({ projectId: a.projectId })}
                      className="block rounded-xl border border-transparent px-2 py-2 transition hover:border-[var(--workspace-border)] hover:bg-[var(--workspace-nav-hover)]"
                    >
                      <p className="line-clamp-2 text-[12px] font-medium text-[var(--workspace-fg)]">{a.title}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--workspace-muted-fg)]">
                        {a.projectName} · {formatRelativeLong(a.at, "en")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {intel && intel.teamLoad.length > 0 ? (
            <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
                Team load
              </p>
              <ul className="mt-3 space-y-3">
                {intel.teamLoad.slice(0, 8).map((t) => (
                  <li key={t.key}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span
                        className={`min-w-0 truncate ${t.overloaded ? "font-medium text-amber-100" : "text-[var(--workspace-fg)]"}`}
                      >
                        {t.label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--workspace-muted-fg)]">
                        {t.activeCount}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--workspace-border)]/60">
                      <motion.div
                        className={`h-2 rounded-full ${t.overloaded ? "bg-amber-400" : "bg-sky-400/90"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (t.activeCount / teamLoadMax) * 100)}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 22 }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {intel && intel.conflictingDeadlines.length > 0 ? (
            <div className="rounded-[20px] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-100">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <p className="text-[12px] font-semibold">Conflicting deadlines</p>
              </div>
              <ul className="mt-3 space-y-2 text-[11px] text-[var(--workspace-muted-fg)]">
                {intel.conflictingDeadlines.map((c, i) => (
                  <li key={i} className="rounded-lg bg-black/15 px-2 py-2">
                    <span className="font-medium text-[var(--workspace-fg)]">{c.ownerLabel}</span> on{" "}
                    {c.dueDate.slice(0, 10)}
                    <div className="mt-1 text-[11px] leading-snug">{c.titles.join(" · ")}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <AnimatePresence>
        {inputOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 pb-8 backdrop-blur-[2px] sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInputOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="max-h-[min(90vh,880px)] w-full max-w-lg overflow-hidden rounded-[22px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] shadow-2xl sm:max-w-xl"
            >
              <div className="border-b border-[var(--workspace-border)]/80 bg-gradient-to-r from-sky-500/10 to-transparent px-5 py-4">
                <h3 className="text-[17px] font-semibold text-[var(--workspace-fg)]">
                  {captureStep === "paste" ? "Paste notes" : "Review commitments"}
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
                  {captureStep === "paste"
                    ? "We turn bullets and action lines into a list you own — nothing is saved until you commit."
                    : "Assign owners and due dates, then commit. Assignees get an in-app notification."}
                </p>
                {captureStep === "paste" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["Meeting", Video],
                        ["Slack", MessageSquare],
                        ["Email", Mail],
                      ] as const
                    ).map(([label, Icon]) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]"
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {captureStep === "paste" ? (
                <form onSubmit={runPropose} className="flex max-h-[calc(min(90vh,880px)-8rem)] flex-col p-5">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={10}
                    className="min-h-[200px] w-full flex-1 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3 text-[13px] leading-relaxed text-[var(--workspace-fg)] shadow-inner outline-none ring-0 transition focus:border-[var(--workspace-accent)]/50"
                    placeholder="Paste transcript, thread, or notes…"
                    autoFocus
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--workspace-muted-fg)]">
                    <span>
                      {wordCount} word{wordCount === 1 ? "" : "s"}
                    </span>
                    {currentProject ? (
                      <span className="rounded-full bg-[var(--workspace-border)]/40 px-2 py-0.5 font-medium text-[var(--workspace-fg)]">
                        → {currentProject.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setInputOpen(false)}
                      className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={captureBusy}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--workspace-fg)] px-5 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-lg disabled:opacity-50"
                    >
                      {captureBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="h-4 w-4" aria-hidden />
                      )}
                      Propose commitments
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex max-h-[calc(min(90vh,880px)-8rem)] flex-col">
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                    {proposedRows.map((row) => (
                      <div
                        key={row.key}
                        className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/50 p-3.5"
                      >
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                          Commitment
                          <textarea
                            value={row.title}
                            onChange={(e) => updateProposedRow(row.key, { title: e.target.value })}
                            rows={2}
                            className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                          />
                        </label>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                            Owner name
                            <input
                              type="text"
                              value={row.ownerName ?? ""}
                              onChange={(e) => updateProposedRow(row.key, { ownerName: e.target.value || null })}
                              placeholder="Who owns this"
                              className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                            />
                          </label>
                          <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                            Due
                            <NativeDateInput
                              value={row.dueDate ? row.dueDate.slice(0, 10) : ""}
                              onChange={(e) =>
                                updateProposedRow(row.key, {
                                  dueDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                                })
                              }
                              className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                            />
                          </label>
                        </div>
                        <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                          Assignee Clerk user ID (optional)
                          <input
                            type="text"
                            value={row.ownerUserId ?? ""}
                            onChange={(e) =>
                              updateProposedRow(row.key, {
                                ownerUserId: e.target.value.trim() || null,
                              })
                            }
                            placeholder="user_… — required for notifications to someone else"
                            className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 font-mono text-[11px] text-[var(--workspace-fg)]"
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => assignRowToMe(row.key)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-nav-hover)] px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)]"
                          >
                            <User className="h-3.5 w-3.5" aria-hidden />
                            Assign to me
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProposedRow(row.key)}
                            className="rounded-full px-3 py-1.5 text-[11px] font-medium text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-border)]/30"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--workspace-border)]/80 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setCaptureStep("paste")}
                      className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
                    >
                      ← Back
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setInputOpen(false)}
                        className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={captureBusy || proposedRows.length === 0}
                        onClick={() => void runCommit()}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--workspace-fg)] px-5 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-lg disabled:opacity-50"
                      >
                        {captureBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Target className="h-4 w-4" aria-hidden />
                        )}
                        Commit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatChip({
  label,
  value,
  sub,
  tone,
  pulse,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: "sky" | "red" | "amber" | "violet" | "emerald";
  pulse?: boolean;
}) {
  const ring =
    tone === "sky"
      ? "from-sky-500/25 to-sky-500/5"
      : tone === "red"
        ? "from-red-500/30 to-red-500/5"
        : tone === "amber"
          ? "from-amber-500/28 to-amber-500/5"
          : tone === "violet"
            ? "from-violet-500/25 to-violet-500/5"
            : "from-emerald-500/25 to-emerald-500/5";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--workspace-border)]/70 bg-gradient-to-br ${ring} p-3 ${
        pulse ? "ring-1 ring-amber-400/35" : ""
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
        {value}
      </p>
      <p className="text-[10px] text-[var(--workspace-muted-fg)]">{sub}</p>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-surface)]/25 px-4 py-10 text-center">
      <p className="text-[14px] font-semibold text-[var(--workspace-fg)]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">{body}</p>
      {action}
    </div>
  );
}

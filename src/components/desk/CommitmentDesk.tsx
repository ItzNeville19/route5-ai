"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  Maximize2,
  MessageSquare,
  PenLine,
  Plus,
  Sparkles,
  Target,
  User,
  UserX,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  Commitment,
  CommitmentSource,
  CommitmentStatus,
  ExecutionOverview,
} from "@/lib/commitment-types";
import type { ExtractedCommitmentDraft } from "@/lib/extract-commitments";
import { NativeDatetimeLocalInput } from "@/components/ui/native-datetime-fields";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";
import DeskGreetingBubble from "@/components/desk/DeskGreetingBubble";
import { useI18n } from "@/components/i18n/I18nProvider";
import { deskUrl } from "@/lib/desk-routes";
import {
  deskHrefWithProjectFilter,
  executionMetricFallbackHrefs,
  orgCommitmentsHref,
} from "@/lib/workspace/commitment-links";
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

function sourceLinkHref(ref: string | null | undefined): string | null {
  const r = ref?.trim();
  if (!r) return null;
  try {
    return new URL(r).href;
  } catch {
    try {
      return new URL(`https://${r.replace(/^\/\//, "")}`).href;
    } catch {
      return null;
    }
  }
}

const STATUSES: CommitmentStatus[] = ["active", "at_risk", "overdue", "completed"];

type DeskFilter = "open" | "my" | "at_risk" | "overdue" | "unassigned" | "history";

const FILTER_DEF: { id: DeskFilter; label: string; icon: LucideIcon }[] = [
  { id: "open", label: "Open", icon: Inbox },
  { id: "my", label: "Mine", icon: User },
  { id: "at_risk", label: "At risk", icon: AlertOctagon },
  { id: "overdue", label: "Overdue", icon: Clock },
  { id: "unassigned", label: "No owner", icon: UserX },
  { id: "history", label: "Completed", icon: CheckCircle2 },
];

function parseDeskFilterFromSearchParams(sp: { get: (key: string) => string | null }): DeskFilter {
  const raw = sp.get("filter");
  if (!raw) return "open";
  const normalized = raw === "mine" ? "my" : raw === "all" ? "open" : raw;
  if (
    normalized === "open" ||
    normalized === "my" ||
    normalized === "at_risk" ||
    normalized === "overdue" ||
    normalized === "unassigned" ||
    normalized === "history"
  ) {
    return normalized;
  }
  return "open";
}

function formatIsoForDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function parseDatetimeLocalToIso(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Same query shape as {@link deskUrl}, plus optional `filter` for deep links / email CTAs. */
function deskHrefWithFilter(projectId: string, filter: DeskFilter): string {
  return deskHrefWithProjectFilter(projectId, filter);
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
  const { t } = useI18n();
  const { map: memberMap, displayName: memberDisplayName, get: getMember } = useMemberDirectory();
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
  const [lastBulkCompleted, setLastBulkCompleted] = useState<{ ids: string[] } | null>(null);
  const [detailFullscreen, setDetailFullscreen] = useState(false);

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
    if (!detailFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [detailFullscreen]);

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
      const q = filter === "open" ? "" : `?filter=${encodeURIComponent(filter)}`;
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

  useEffect(() => {
    if (!inputOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      const editable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (!editable) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
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

  function assignAllRowsToMe() {
    if (!user?.id) {
      pushToast("Sign in to assign to yourself.", "error");
      return;
    }
    setProposedRows((rows) =>
      rows.map((row) => ({
        ...row,
        ownerUserId: user.id,
        ownerName: user.fullName ?? user.firstName ?? user.primaryEmailAddress?.emailAddress ?? "You",
      }))
    );
  }

  function assignAllRowsToOwner(ownerUserId: string | null) {
    if (!ownerUserId) return;
    const profile = getMember(ownerUserId);
    const fallbackSelf =
      ownerUserId === user?.id
        ? user?.fullName ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "You"
        : ownerUserId;
    const ownerName =
      [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
      (profile?.username ? `@${profile.username}` : "") ||
      profile?.primaryEmail?.split("@")[0] ||
      fallbackSelf;
    setProposedRows((rows) =>
      rows.map((row) => ({
        ...row,
        ownerUserId,
        ownerName,
      }))
    );
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
      setLastBulkCompleted({ ids: todo.map((r) => r.id) });
      pushToast(`Marked ${todo.length} commitment${todo.length === 1 ? "" : "s"} complete.`, "success");
    } finally {
      setSaving(false);
    }
  }

  async function undoCompleteVisibleCommitments() {
    if (!lastBulkCompleted || lastBulkCompleted.ids.length === 0) return;
    setSaving(true);
    try {
      for (const id of lastBulkCompleted.ids) {
        await patchCommitmentById(id, { status: "active" });
      }
      pushToast("Undo complete-all applied.", "success");
      setLastBulkCompleted(null);
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

  /** Metric tiles → filtered Desk or org tracker when no project exists yet. */
  const statLinks = useMemo(() => {
    const pid = projectId || projects[0]?.id;
    if (!pid) return executionMetricFallbackHrefs();
    return {
      active: deskHrefWithProjectFilter(pid, "open"),
      overdue: deskHrefWithProjectFilter(pid, "overdue"),
      atRisk: deskHrefWithProjectFilter(pid, "at_risk"),
      unassigned: deskHrefWithProjectFilter(pid, "unassigned"),
      weekClosed: deskHrefWithProjectFilter(pid, "history"),
    };
  }, [projectId, projects]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1680px] flex-col gap-10 pb-20 pt-1 sm:pt-2">
      <DeskGreetingBubble />
      <div className="flex min-w-0 flex-col gap-5">
        {/* Workspace execution strip */}
        <motion.section
          layout
          initial={{ opacity: 0.92, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
          style={{ perspective: "1200px" }}
          className="relative overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--workspace-accent)_30%,var(--workspace-border))] bg-gradient-to-br from-[color-mix(in_srgb,var(--workspace-accent)_12%,var(--workspace-canvas))] via-[var(--workspace-canvas)]/50 to-[color-mix(in_srgb,var(--workspace-accent)_10%,var(--workspace-canvas))] p-[1px] shadow-[0_28px_90px_-42px_color-mix(in_srgb,var(--workspace-accent)_18%,transparent),0_24px_80px_-40px_rgba(0,0,0,0.52)]"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_28%_-18%,rgba(254,215,170,0.1),transparent_52%),radial-gradient(ellipse_65%_55%_at_90%_5%,rgba(56,189,248,0.11),transparent_48%)]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] border border-white/[0.08] bg-gradient-to-b from-[var(--workspace-canvas)]/45 via-[var(--workspace-surface)]/28 to-slate-950/25 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
                {currentProject?.name?.trim() ? (
                  <>
                    {t("desk.strip.projectPrefix")}{" "}
                    <span className="text-[var(--workspace-fg)]">{currentProject.name}</span>
                  </>
                ) : (
                  t("desk.strip.deskFallback")
                )}
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[20px]">
                {t("desk.strip.title")}
              </h2>
              <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[var(--workspace-muted-fg)] sm:text-[13px]">
                {t("desk.strip.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setInputOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--workspace-fg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-lg shadow-black/20 transition hover:opacity-95"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {t("desk.strip.addDecision")}
              </button>
              <Link
                href="/overview"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)]"
              >
                {t("desk.strip.overview")}
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
                  label={t("commitment.metrics.active")}
                  value={intel.summary.activeTotal}
                  sub={t("desk.stats.sub.open")}
                  tone="sky"
                  href={statLinks.active}
                  ariaTemplate={t("desk.stats.aria")}
                  openListHint={t("commitment.openList")}
                />
                <StatChip
                  label={t("commitment.metrics.overdue")}
                  value={intel.summary.overdueCount}
                  sub={t("desk.stats.sub.pastDue")}
                  tone="red"
                  pulse={intel.summary.overdueCount > 0}
                  href={statLinks.overdue}
                  ariaTemplate={t("desk.stats.aria")}
                  openListHint={t("commitment.openList")}
                />
                <StatChip
                  label={t("commitment.metrics.atRisk")}
                  value={intel.summary.atRiskCount}
                  sub={t("desk.stats.sub.stale")}
                  tone="amber"
                  pulse={intel.summary.atRiskCount > 0}
                  href={statLinks.atRisk}
                  ariaTemplate={t("desk.stats.aria")}
                  openListHint={t("commitment.openList")}
                />
                <StatChip
                  label={t("commitment.metrics.unassigned")}
                  value={intel.summary.unassignedCount}
                  sub={t("desk.stats.sub.noOwner")}
                  tone="violet"
                  pulse={intel.summary.unassignedCount > 0}
                  href={statLinks.unassigned}
                  ariaTemplate={t("desk.stats.aria")}
                  openListHint={t("commitment.openList")}
                />
                <StatChip
                  label={t("desk.stats.weekClosed")}
                  value={`${Math.round(intel.summary.pctCompletedThisWeek)}%`}
                  sub={t("desk.stats.sub.completed7d")}
                  tone="emerald"
                  href={statLinks.weekClosed}
                  ariaTemplate={t("desk.stats.ariaPct")}
                  openListHint={t("commitment.openList")}
                />
              </>
            ) : (
              <p className="col-span-full text-[13px] text-[var(--workspace-muted-fg)]">
                {t("desk.stats.unavailable")}
              </p>
            )}
          </div>

          {intel && !loadingIntel ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08 }}
              className="flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={orgCommitmentsHref()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--workspace-accent)_35%,var(--workspace-border))] bg-[color-mix(in_srgb,var(--workspace-accent)_12%,transparent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[var(--workspace-accent)]/55 hover:bg-[color-mix(in_srgb,var(--workspace-accent)_18%,transparent)]"
                >
                  {t("desk.fixQueue.cta")}
                  <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden />
                </Link>
                <span className="text-[11px] text-[var(--workspace-muted-fg)]">{t("desk.fixQueue.hint")}</span>
              </div>
            </motion.div>
          ) : null}
        </div>
          <div
            className="desk-greeting-wave-drift pointer-events-none absolute bottom-0 left-0 right-0 h-11 text-[color-mix(in_srgb,var(--workspace-accent)_45%,#7dd3fc)]/50 sm:h-12"
            aria-hidden
          >
            <svg className="h-full w-full" viewBox="0 0 1200 64" preserveAspectRatio="none">
              <path
                fill="currentColor"
                fillOpacity={0.45}
                d="M0,40 C200,24 400,56 600,40 C800,24 1000,56 1200,40 L1200,64 L0,64 Z"
              />
              <path
                fill="currentColor"
                fillOpacity={0.65}
                d="M0,48 C240,58 480,34 720,50 C960,66 1080,42 1200,52 L1200,64 L0,64 Z"
              />
            </svg>
          </div>
        </motion.section>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Left rail */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[268px]">
          <div className="rounded-[20px] border border-[color-mix(in_srgb,var(--workspace-accent)_24%,var(--workspace-border))] bg-gradient-to-b from-[var(--workspace-surface)]/88 to-[var(--workspace-canvas)]/55 p-4 shadow-[0_8px_36px_-18px_color-mix(in_srgb,var(--workspace-accent)_14%,transparent)] backdrop-blur-sm">
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

          <div className="rounded-[20px] border border-[color-mix(in_srgb,var(--workspace-accent)_24%,var(--workspace-border))] bg-gradient-to-b from-[var(--workspace-surface)]/88 to-[var(--workspace-canvas)]/55 p-3 shadow-[0_8px_36px_-18px_color-mix(in_srgb,var(--workspace-accent)_14%,transparent)] backdrop-blur-sm">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
              Show
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
        <main className="min-w-0 flex-1 overflow-hidden rounded-[22px] border border-[color-mix(in_srgb,var(--workspace-accent)_24%,var(--workspace-border))] bg-gradient-to-br from-[color-mix(in_srgb,var(--workspace-accent)_10%,var(--workspace-canvas))] via-[var(--workspace-canvas)]/48 to-[color-mix(in_srgb,var(--workspace-accent)_8%,var(--workspace-canvas))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_-28px_color-mix(in_srgb,var(--workspace-accent)_10%,transparent)]">
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
                    {loadingList
                      ? "Loading…"
                      : filter === "history"
                        ? `${commitments.length} completed`
                        : `${commitments.length} open`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || loadingList || commitments.length === 0 || filter === "history"}
                    onClick={() => void completeVisibleCommitments()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/30 hover:bg-[var(--workspace-nav-hover)] disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Checkmark all
                  </button>
                  <button
                    type="button"
                    disabled={saving || !lastBulkCompleted || lastBulkCompleted.ids.length === 0}
                    onClick={() => void undoCompleteVisibleCommitments()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/30 hover:bg-[var(--workspace-nav-hover)] disabled:opacity-40"
                  >
                    Undo
                  </button>
                </div>
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
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          setSelectedId(c.id);
                          setDetailFullscreen(true);
                        }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.995 }}
                        className={`w-full rounded-xl border border-l-[3px] px-3 py-2.5 text-left shadow-sm transition ${STATUS_ACCENT[c.status]} ${
                          sel
                            ? "border-[var(--workspace-accent)]/50 bg-[var(--workspace-surface)]/95 ring-1 ring-[var(--workspace-accent)]/25"
                            : "border-[var(--workspace-border)]/70 bg-[var(--workspace-surface)]/40 hover:border-[var(--workspace-accent)]/28 hover:bg-[var(--workspace-surface)]/65"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[var(--workspace-fg)]">
                            {c.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_PILL[c.status]}`}
                          >
                            {STATUS_LABEL[c.status]}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--workspace-muted-fg)]">
                          <span className="inline-flex items-center gap-1.5">
                            {(() => {
                              const profile = c.ownerUserId ? getMember(c.ownerUserId) : undefined;
                              const label =
                                c.ownerDisplayName?.trim() ||
                                (c.ownerUserId
                                  ? memberDisplayName(
                                      c.ownerUserId,
                                      user?.id,
                                      user?.fullName ?? user?.firstName ?? "You"
                                    )
                                  : "Unassigned");
                              if (profile?.imageUrl) {
                                return (
                                  <Image
                                    src={profile.imageUrl}
                                    alt={label}
                                    width={16}
                                    height={16}
                                    className="h-4 w-4 rounded-full border border-[var(--workspace-border)]/80 object-cover"
                                  />
                                );
                              }
                              return <CircleUser className="h-3.5 w-3.5" aria-hidden />;
                            })()}
                            {c.ownerDisplayName?.trim() ||
                              (c.ownerUserId
                                ? memberDisplayName(
                                    c.ownerUserId,
                                    user?.id,
                                    user?.fullName ?? user?.firstName ?? "You"
                                  )
                                : "Unassigned")}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--workspace-border)]/50 px-1.5 py-0.5 text-[10px] font-medium text-[var(--workspace-fg)]/90">
                            <SourceIcon className="h-3 w-3 opacity-80" aria-hidden />
                            {SOURCE_LABEL[c.source]}
                          </span>
                          {c.dueDate ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden />
                              Due {new Date(c.dueDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 line-clamp-1 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
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
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--workspace-border)]/90 px-4 py-3 sm:px-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--workspace-fg)]">Inspector</h3>
                  <p className="text-[11px] text-[var(--workspace-muted-fg)]">
                    Status, owner, links, and notes — double-click a row for full screen
                  </p>
                </div>
                {selected ? (
                  <button
                    type="button"
                    onClick={() => setDetailFullscreen(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
                  >
                    <Maximize2 className="h-3.5 w-3.5 opacity-80" aria-hidden />
                    Full screen
                  </button>
                ) : null}
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

                  <div className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/45 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      Signals
                    </p>
                    <ul className="mt-3 space-y-2 text-[12px] leading-snug">
                      {!selected.ownerUserId && !selected.ownerDisplayName?.trim() ? (
                        <li className="flex items-start gap-2 rounded-lg bg-[color-mix(in_srgb,var(--workspace-danger-fg)_12%,transparent)] px-2 py-2 text-[var(--workspace-fg)]">
                          <UserX className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--workspace-danger-fg)_85%,var(--workspace-fg))]" aria-hidden />
                          <span>
                            <span className="font-semibold">No owner assigned.</span>{" "}
                            Assign below or use &quot;Assign to me&quot; — unassigned items don&apos;t count as
                            claimed execution.
                          </span>
                        </li>
                      ) : null}
                      {!selected.dueDate ? (
                        <li className="flex items-start gap-2 rounded-lg bg-[color-mix(in_srgb,var(--workspace-accent)_10%,transparent)] px-2 py-2 text-[var(--workspace-fg)]">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
                          <span>
                            <span className="font-semibold">No due date.</span> Set one below so escalation and digest
                            logic can anchor to a real deadline.
                          </span>
                        </li>
                      ) : null}
                      {selected.status === "at_risk" ? (
                        <li className="flex items-start gap-2 rounded-lg px-2 py-2 text-[var(--workspace-fg)]">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_srgb,#d97706_75%,var(--workspace-fg))]" aria-hidden />
                          <span className="font-semibold">Flagged at risk — review scope and dates.</span>
                        </li>
                      ) : null}
                      {selected.status === "overdue" ? (
                        <li className="flex items-start gap-2 rounded-lg px-2 py-2 text-[color-mix(in_srgb,var(--workspace-danger-fg)_92%,var(--workspace-fg))]">
                          <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                          <span className="font-semibold">Overdue — prioritize or reschedule.</span>
                        </li>
                      ) : null}
                      {(selected.ownerUserId || selected.ownerDisplayName?.trim()) &&
                      selected.dueDate &&
                      selected.status !== "at_risk" &&
                      selected.status !== "overdue" &&
                      selected.status !== "completed" ? (
                        <li className="text-[var(--workspace-muted-fg)]">
                          Ownership and deadline are set — use status chips below as execution moves.
                        </li>
                      ) : null}
                      {selected.status === "completed" ? (
                        <li className="text-[var(--workspace-muted-fg)]">Completed — switch the Desk filter to History to audit the record.</li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/35 p-4">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      Due date &amp; time
                    </label>
                    <NativeDatetimeLocalInput
                      value={formatIsoForDatetimeLocal(selected.dueDate)}
                      onChange={(e) => void patchCommitment({ dueDate: parseDatetimeLocalToIso(e.target.value) })}
                      className="mt-2 w-full max-w-md rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
                      Clearing the picker removes the deadline. Times save in UTC and display in your locale.
                    </p>
                  </div>

                  {selected.sourceReference?.trim() ? (
                    <div className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/35 p-4">
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                        Source · {SOURCE_LABEL[selected.source]}
                      </p>
                      {sourceLinkHref(selected.sourceReference) ? (
                        <a
                          href={sourceLinkHref(selected.sourceReference)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--workspace-accent)] underline-offset-4 hover:underline"
                        >
                          Open link
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                        </a>
                      ) : (
                        <p className="mt-2 rounded-xl bg-[var(--workspace-canvas)]/70 px-3 py-2 font-mono text-[11px] leading-snug text-[var(--workspace-fg)]">
                          {selected.sourceReference.trim()}
                        </p>
                      )}
                    </div>
                  ) : null}

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
          <div className="rounded-[20px] border border-[color-mix(in_srgb,var(--workspace-accent)_24%,var(--workspace-border))] bg-gradient-to-b from-[var(--workspace-surface)]/88 to-[var(--workspace-canvas)]/60 p-4 shadow-[0_8px_36px_-18px_color-mix(in_srgb,var(--workspace-accent)_12%,transparent)]">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--workspace-accent)_18%,transparent)] text-[var(--workspace-accent)]">
                <Target className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--workspace-fg)]">Workload signals</p>
                <p className="text-[11px] leading-snug text-[var(--workspace-muted-fg)]">
                  Who&apos;s overloaded, what&apos;s unassigned, and overlapping due dates — act from the list at left.
                </p>
              </div>
            </div>
            {loadingIntel ? (
              <p className="mt-4 text-[12px] text-[var(--workspace-muted-fg)]">Loading…</p>
            ) : intel ? (
              <ul className="mt-4 space-y-3 text-[12px]">
                <li className="flex items-center justify-between rounded-xl bg-[var(--workspace-surface)]/40 px-3 py-2">
                  <span className="text-[var(--workspace-muted-fg)]">Owners over capacity</span>
                  <span className="font-semibold tabular-nums text-[var(--workspace-fg)]">
                    {intel.teamLoad.filter((t) => t.overloaded).length || "0"}
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-[var(--workspace-surface)]/40 px-3 py-2">
                  <span className="text-[var(--workspace-muted-fg)]">Unassigned in this workspace</span>
                  <span className="font-semibold tabular-nums text-[color-mix(in_srgb,var(--workspace-danger-fg)_88%,var(--workspace-fg))]">
                    {unassignedCount}
                  </span>
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
            <div className="rounded-[20px] border border-[color-mix(in_srgb,var(--workspace-accent)_24%,var(--workspace-border))] bg-gradient-to-b from-[var(--workspace-surface)]/88 to-[var(--workspace-canvas)]/60 p-4 shadow-[0_8px_36px_-18px_color-mix(in_srgb,var(--workspace-accent)_12%,transparent)]">
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
            <div className="rounded-[20px] border border-[color-mix(in_srgb,var(--workspace-accent)_24%,var(--workspace-border))] bg-gradient-to-b from-[var(--workspace-surface)]/88 to-[var(--workspace-canvas)]/60 p-4 shadow-[0_8px_36px_-18px_color-mix(in_srgb,var(--workspace-accent)_12%,transparent)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
                Team load
              </p>
              <ul className="mt-3 space-y-3">
                {intel.teamLoad.slice(0, 8).map((t) => (
                  <li key={t.key}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span
                        className={`min-w-0 truncate ${t.overloaded ? "font-semibold text-[color-mix(in_srgb,var(--workspace-danger-fg)_92%,var(--workspace-fg))]" : "text-[var(--workspace-fg)]"}`}
                      >
                        {t.label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--workspace-muted-fg)]">
                        {t.activeCount}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--workspace-border)]/60">
                      <motion.div
                        className={`h-2 rounded-full ${t.overloaded ? "bg-[color-mix(in_srgb,var(--workspace-danger-fg)_85%,var(--workspace-accent))]" : "bg-[color-mix(in_srgb,var(--workspace-accent)_75%,#38bdf8)]/90"}`}
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
              <div className="flex items-center gap-2 text-[var(--workspace-fg)]">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--workspace-danger-fg)_85%,var(--workspace-fg))]" aria-hidden />
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
              <div className="border-b border-[var(--workspace-border)]/80 bg-gradient-to-r from-[color-mix(in_srgb,var(--workspace-accent)_12%,transparent)] to-transparent px-5 py-4">
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
                  <div className="flex flex-wrap items-center gap-2 border-b border-[var(--workspace-border)]/80 px-5 py-3">
                    <button
                      type="button"
                      onClick={assignAllRowsToMe}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-nav-hover)] px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)]"
                    >
                      <User className="h-3.5 w-3.5" aria-hidden />
                      Assign all to me
                    </button>
                    <label className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)]">
                      Assign all to…
                      <input
                        list="route5-owner-picker"
                        placeholder="Type name or user id"
                        className="w-[180px] bg-transparent text-[11px] font-medium outline-none placeholder:text-[var(--workspace-muted-fg)]"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (!value) return;
                          const direct = memberMap.has(value) ? value : null;
                          const byName =
                            direct ??
                            [...memberMap.entries()].find(([, p]) => {
                              const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim().toLowerCase();
                              const username = p.username?.toLowerCase() ?? "";
                              const emailLocal = p.primaryEmail?.split("@")[0]?.toLowerCase() ?? "";
                              const needle = value.toLowerCase();
                              return full === needle || username === needle || emailLocal === needle;
                            })?.[0] ??
                            null;
                          if (byName) assignAllRowsToOwner(byName);
                        }}
                      />
                      <datalist id="route5-owner-picker">
                        {[...memberMap.entries()].map(([id, p]) => {
                          const label =
                            [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
                            p.username ||
                            p.primaryEmail?.split("@")[0] ||
                            id;
                          return <option key={id} value={id}>{label}</option>;
                        })}
                      </datalist>
                    </label>
                  </div>
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
                            <NativeDatetimeLocalInput
                              value={formatIsoForDatetimeLocal(row.dueDate)}
                              onChange={(e) =>
                                updateProposedRow(row.key, {
                                  dueDate: parseDatetimeLocalToIso(e.target.value),
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

      <AnimatePresence>
        {detailFullscreen && selected ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="desk-fs-title"
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-3 backdrop-blur-[3px] sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetailFullscreen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="max-h-[min(90vh,900px)] w-full max-w-2xl overflow-hidden rounded-[22px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--workspace-border)] px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
                    Commitment
                  </p>
                  <h2 id="desk-fs-title" className="mt-1 text-[clamp(1.05rem,2.5vw,1.25rem)] font-semibold leading-snug text-[var(--workspace-fg)]">
                    {selected.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailFullscreen(false)}
                  className="shrink-0 rounded-full p-2 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]"
                  aria-label="Close full screen"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="max-h-[calc(min(90vh,900px)-5rem)] space-y-4 overflow-y-auto px-5 py-5">
                <div className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/45 p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                    Description
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
                    {selected.description?.trim() || "No description yet."}
                  </p>
                </div>
                {selected.sourceReference?.trim() ? (
                  <div className="rounded-2xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      Source · {SOURCE_LABEL[selected.source]}
                    </p>
                    {sourceLinkHref(selected.sourceReference) ? (
                      <a
                        href={sourceLinkHref(selected.sourceReference)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--workspace-accent)]/12 px-4 py-2.5 text-[14px] font-semibold text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent)]/18"
                      >
                        Open meeting or thread
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    ) : (
                      <p className="mt-2 rounded-xl bg-[var(--workspace-canvas)]/80 px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]">
                        {selected.sourceReference.trim()}
                      </p>
                    )}
                  </div>
                ) : null}
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
                <button
                  type="button"
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--workspace-accent)]/35 bg-[var(--workspace-accent)]/10 px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-accent)]/20"
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
              </div>
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
  href,
  ariaTemplate,
  openListHint,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: "sky" | "red" | "amber" | "violet" | "emerald";
  pulse?: boolean;
  href: string;
  ariaTemplate: string;
  openListHint: string;
}) {
  const ring =
    tone === "sky"
      ? "from-[color-mix(in_srgb,var(--workspace-accent)_22%,transparent)] via-[color-mix(in_srgb,var(--workspace-accent)_14%,var(--workspace-canvas))] to-[color-mix(in_srgb,var(--workspace-canvas)_90%,#020617)]"
      : tone === "red"
        ? "from-red-500/30 to-red-500/5"
        : tone === "amber"
          ? "from-amber-500/28 to-amber-500/5"
          : tone === "violet"
            ? "from-violet-500/25 to-violet-500/5"
            : "from-emerald-500/28 to-emerald-950/15";

  const ariaLabel = `${label}: ${value}. ${sub}. ${ariaTemplate}`;
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
        {value}
      </p>
      <p className="text-[10px] text-[var(--workspace-muted-fg)]">{sub}</p>
      <p className="mt-1 text-[10px] font-semibold text-[var(--workspace-accent)]/95">{openListHint}</p>
    </>
  );

  const shellCls = `relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--workspace-accent)_20%,var(--workspace-border))] bg-gradient-to-br ${ring} p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[transform,box-shadow] duration-200 ease-out [transform-style:preserve-3d] ${
    pulse ? "ring-1 ring-amber-400/35" : ""
  }`;

  return (
    <motion.div
      whileHover={{ y: -3, rotateX: 3, rotateY: -2, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Link
        href={href}
        aria-label={ariaLabel}
        className={`block outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--workspace-canvas)] ${shellCls} hover:shadow-[0_14px_40px_-24px_color-mix(in_srgb,var(--workspace-accent)_35%,transparent)]`}
      >
        {inner}
      </Link>
    </motion.div>
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
    <div className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--workspace-accent)_28%,var(--workspace-border))] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_srgb,var(--workspace-accent)_14%,transparent),transparent_55%),linear-gradient(to_bottom,var(--workspace-surface)_0%,var(--workspace-canvas)_100%)] px-5 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[15px] font-semibold tracking-tight text-[var(--workspace-fg)]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">{body}</p>
      {action}
    </div>
  );
}

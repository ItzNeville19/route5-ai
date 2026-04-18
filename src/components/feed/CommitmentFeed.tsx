"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import type {
  OrgCommitmentDetail,
  OrgCommitmentRow,
  OrgCommitmentListSort,
} from "@/lib/org-commitment-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  formatFeedDueLabel,
  groupFeedRows,
  isCompletedRow,
  isCompletedVisibleInFeed,
  isMissingDeadline,
  type FeedBucket,
} from "@/lib/feed/group-commitments";
import { ORG_PRIORITY_LABEL } from "@/lib/org-commitments/tracker-constants";
import FeedExecutionSnapshot from "@/components/feed/FeedExecutionSnapshot";
import FeedPersonalGreeting from "@/components/feed/FeedPersonalGreeting";
import { useCapture } from "@/components/capture/CaptureProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  clerkDisplayName,
  clerkSelfInitials,
  ownerHoverLabelFromId,
  ownerInitialsFromId,
} from "@/components/feed/feed-user-display";

const FEED_BUCKETS: FeedBucket[] = ["overdue", "today", "week", "later", "completed"];

const SECTION_LABEL: Record<FeedBucket, string> = {
  overdue: "Overdue",
  today: "Due Today",
  week: "This Week",
  later: "Later",
  completed: "Completed",
};

type FeedFilter = "all" | "mine" | "team" | "unassigned" | "overdue" | "at_risk";

type FeedSortUi = "due" | "priority" | "owner" | "updated" | "created";

const FEED_GUIDE_KEY = "route5:feed-guide-dismissed";

const FEED_FILTER_OPTIONS: readonly { value: FeedFilter; label: string; hint: string }[] = [
  { value: "all", label: "All", hint: "Every open commitment in this workspace" },
  { value: "mine", label: "Mine", hint: "Owned by you" },
  {
    value: "team",
    label: "Teammates",
    hint: "Owned by someone else (collaboration across owners)",
  },
  { value: "unassigned", label: "Unassigned", hint: "No owner set yet" },
  { value: "overdue", label: "Overdue", hint: "Past deadline and not done" },
  { value: "at_risk", label: "At Risk", hint: "Flagged as needing attention" },
];

function sortApiParams(ui: FeedSortUi): { sort: OrgCommitmentListSort; order: "asc" | "desc" } {
  switch (ui) {
    case "priority":
      return { sort: "priority", order: "asc" };
    case "owner":
      return { sort: "owner_id", order: "asc" };
    case "updated":
      return { sort: "updated_at", order: "desc" };
    case "created":
      return { sort: "created_at", order: "desc" };
    case "due":
    default:
      return { sort: "deadline", order: "asc" };
  }
}

function ownerAccentBg(ownerId: string): string {
  if (!ownerId.trim()) return "";
  let h = 0;
  for (let i = 0; i < ownerId.length; i++) h = (h * 31 + ownerId.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 42% 36%)`;
}

function isUnassignedOwner(ownerId: string): boolean {
  return !ownerId.trim();
}

function circleTone(status: OrgCommitmentRow["status"], completed: boolean): string {
  if (completed) return "bg-r5-status-completed border-r5-status-completed";
  switch (status) {
    case "overdue":
      return "bg-r5-status-overdue border-r5-status-overdue";
    case "at_risk":
      return "bg-r5-status-at-risk border-r5-status-at-risk";
    case "in_progress":
      return "bg-r5-status-on-track border-r5-status-on-track";
    case "on_track":
      return "bg-r5-status-completed border-r5-status-completed";
    case "not_started":
      return "bg-r5-surface-secondary border-r5-text-tertiary/50";
    default:
      return "bg-r5-surface-secondary border-r5-text-tertiary/40";
  }
}

function priorityBarTone(p: OrgCommitmentRow["priority"]): { show: boolean; className: string } {
  if (p === "critical") return { show: true, className: "bg-r5-status-overdue" };
  if (p === "high") return { show: true, className: "bg-r5-status-at-risk" };
  return { show: false, className: "" };
}

function startOfUtcWeek(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function historyFieldLabel(field: string): string {
  const map: Record<string, string> = {
    title: "Title",
    description: "Description",
    owner_id: "Owner",
    deadline: "Deadline",
    priority: "Priority",
    status: "Status",
    project_id: "Project",
    completed_at: "Completed",
  };
  return map[field] ?? field.replace(/_/g, " ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedTitle({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  let parts: string[];
  try {
    parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  } catch {
    return <>{text}</>;
  }
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-[var(--r5-radius-badge)] bg-r5-status-at-risk/25 px-[var(--r5-space-1)] text-inherit"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function applyFeedFilter(
  rows: OrgCommitmentRow[],
  filter: FeedFilter,
  selfId: string | undefined
): OrgCommitmentRow[] {
  switch (filter) {
    case "mine":
      return rows.filter((r) => selfId && r.ownerId === selfId);
    case "team":
      return rows.filter((r) => r.ownerId.trim() && r.ownerId !== selfId);
    case "unassigned":
      return rows.filter((r) => isUnassignedOwner(r.ownerId));
    case "overdue":
      return rows.filter((r) => !isCompletedRow(r) && r.status === "overdue");
    case "at_risk":
      return rows.filter((r) => !isCompletedRow(r) && r.status === "at_risk");
    case "all":
    default:
      return rows;
  }
}

function feedVisibleRows(rows: OrgCommitmentRow[]): OrgCommitmentRow[] {
  return rows.filter((r) => !isCompletedRow(r) || isCompletedVisibleInFeed(r));
}

export default function CommitmentFeed() {
  const { user } = useUser();
  const { open: openCapture } = useCapture();
  const { refreshSummary } = useWorkspaceData();
  const { pushToast } = useWorkspaceExperience();
  const selfId = user?.id;
  const selfDisplayName = useMemo(() => clerkDisplayName(user), [user]);
  const selfInitials = useMemo(() => clerkSelfInitials(user), [user]);

  const [rows, setRows] = useState<OrgCommitmentRow[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, OrgCommitmentDetail | undefined>>({});
  const [completedOpen, setCompletedOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [feedSort, setFeedSort] = useState<FeedSortUi>("due");
  const [feedSearch, setFeedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [popover, setPopover] = useState<
    | { type: "owner" | "due"; commitmentId: string; draft: string }
    | null
  >(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const rowIdsSeen = useRef<Set<string>>(new Set());
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());

  const { sort: apiSort, order: apiOrder } = sortApiParams(feedSort);

  const loadList = useCallback(async () => {
    const sp = new URLSearchParams();
    sp.set("sort", apiSort);
    sp.set("order", apiOrder);
    const res = await fetch(`/api/commitments?${sp.toString()}`, {
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as {
      orgId?: string;
      commitments?: OrgCommitmentRow[];
    };
    if (res.ok) {
      if (data.orgId) setOrgId(data.orgId);
      setRows(data.commitments ?? []);
    }
    setBootstrapped(true);
  }, [apiSort, apiOrder]);

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as {
      projects?: { id: string; name: string }[];
    };
    if (res.ok && data.projects) {
      setProjects(data.projects.map((p) => ({ id: p.id, name: p.name })));
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!bootstrapped) return;
    const seen = rowIdsSeen.current;
    const incoming = rows.map((r) => r.id);
    if (seen.size === 0 && incoming.length > 0) {
      for (const id of incoming) seen.add(id);
      return;
    }
    const added: string[] = [];
    for (const id of incoming) {
      if (!seen.has(id)) added.push(id);
    }
    for (const id of incoming) seen.add(id);
    if (added.length > 0) {
      setJustAddedIds(new Set(added));
      const t = window.setTimeout(() => setJustAddedIds(new Set()), 1000);
      return () => window.clearTimeout(t);
    }
  }, [rows, bootstrapped]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/commitments/${id}`, { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as {
      commitment?: OrgCommitmentDetail;
    };
    if (res.ok && data.commitment) {
      setDetails((d) => ({ ...d, [id]: data.commitment }));
    }
  }, []);

  useEffect(() => {
    if (expandedId) void loadDetail(expandedId);
  }, [expandedId, loadDetail]);

  useEffect(() => {
    if (!orgId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`org-commitments:${orgId}`);
    channel.on("broadcast", { event: "change" }, () => {
      void loadList();
      if (expandedId) void loadDetail(expandedId);
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [orgId, loadList, loadDetail, expandedId]);

  useEffect(() => {
    if (!popover) return;
    const onDoc = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popover]);

  useEffect(() => {
    if (!expandedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expandedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projectNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  const visibleRows = useMemo(() => feedVisibleRows(rows), [rows]);

  const filterOnlyRows = useMemo(
    () => applyFeedFilter(visibleRows, feedFilter, selfId),
    [visibleRows, feedFilter, selfId]
  );

  const searchFiltered = useMemo(() => {
    const q = feedSearch.trim().toLowerCase();
    if (!q) return filterOnlyRows;
    return filterOnlyRows.filter((r) => {
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.description?.toLowerCase().includes(q)) return true;
      const pn = r.projectId ? projectNameById.get(r.projectId) : undefined;
      if (pn?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [filterOnlyRows, feedSearch, projectNameById]);

  const grouped = useMemo(() => groupFeedRows(searchFiltered), [searchFiltered]);

  const openCount = useMemo(
    () => searchFiltered.filter((c) => !isCompletedRow(c)).length,
    [searchFiltered]
  );

  const overdueCount = useMemo(
    () => filterOnlyRows.filter((r) => !isCompletedRow(r) && r.status === "overdue").length,
    [filterOnlyRows]
  );

  const activeCount = useMemo(
    () => filterOnlyRows.filter((c) => !isCompletedRow(c)).length,
    [filterOnlyRows]
  );

  const completedThisWeek = useMemo(() => {
    const wk = startOfUtcWeek();
    return rows.filter((c) => {
      if (!c.completedAt) return false;
      return new Date(c.completedAt).getTime() >= wk.getTime();
    }).length;
  }, [rows]);

  const applyRowPatch = useCallback((id: string, patch: Partial<OrgCommitmentRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDetails((prev) => {
      const d = prev[id];
      if (!d) return prev;
      return { ...prev, [id]: { ...d, ...patch } };
    });
  }, []);

  const revertRow = useCallback((id: string, snapshot: OrgCommitmentRow) => {
    setRows((prev) => prev.map((r) => (r.id === id ? snapshot : r)));
  }, []);

  const patchRemote = useCallback(
    async (id: string, body: Record<string, unknown>, snapshot: OrgCommitmentRow) => {
      const res = await fetch(`/api/commitments/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { commitment?: OrgCommitmentRow };
      if (!res.ok || !data.commitment) {
        revertRow(id, snapshot);
        pushToast("Could not save — reverted.", "error");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? data.commitment! : r)));
      setDetails((prev) => {
        const d = prev[id];
        if (!d) return prev;
        return { ...prev, [id]: { ...d, ...data.commitment! } };
      });
      void loadDetail(id);
    },
    [revertRow, pushToast, loadDetail]
  );

  async function markComplete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const row = rows.find((r) => r.id === id);
    if (!row || isCompletedRow(row) || completingId) return;
    const snapshot = { ...row };
    setCompletingId(id);
    await new Promise((r) => setTimeout(r, 400));
    setCompletingId(null);
    const now = new Date().toISOString();
    applyRowPatch(id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
    await patchRemote(id, { completed: true }, snapshot);
  }

  async function dismissCommitment(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const snapshot = rows.find((r) => r.id === id);
    if (!snapshot) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setExpandedId((eid) => (eid === id ? null : eid));
    const res = await fetch(`/api/commitments/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) {
      setRows((prev) => [...prev, snapshot].sort((a, b) => a.title.localeCompare(b.title)));
      pushToast("Could not delete.", "error");
    }
  }

  async function saveOwner(id: string, ownerId: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const snapshot = { ...row };
    applyRowPatch(id, { ownerId });
    setPopover(null);
    await patchRemote(id, { ownerId }, snapshot);
  }

  async function saveDeadline(id: string, iso: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const snapshot = { ...row };
    applyRowPatch(id, { deadline: new Date(iso).toISOString() });
    setPopover(null);
    await patchRemote(id, { deadline: new Date(iso).toISOString() }, snapshot);
  }

  async function saveTitle(id: string, title: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || !title.trim()) return;
    const snapshot = { ...row };
    applyRowPatch(id, { title: title.trim() });
    await patchRemote(id, { title: title.trim() }, snapshot);
  }

  async function saveDescription(id: string, description: string | null) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const snapshot = { ...row };
    applyRowPatch(id, { description });
    await patchRemote(id, { description }, snapshot);
  }

  async function savePriority(id: string, priority: OrgCommitmentRow["priority"]) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const snapshot = { ...row };
    applyRowPatch(id, { priority });
    await patchRemote(id, { priority }, snapshot);
  }

  async function saveProject(id: string, projectId: string | null) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const snapshot = { ...row };
    applyRowPatch(id, { projectId });
    await patchRemote(id, { projectId }, snapshot);
  }

  async function postComment(commitmentId: string, content: string) {
    const res = await fetch(`/api/commitments/${commitmentId}/comments`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) void loadDetail(commitmentId);
    else pushToast("Could not post comment.", "error");
  }

  const onRefreshFeed = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadList(), refreshSummary()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadList, refreshSummary]);

  const filterActive = feedFilter !== "all";

  if (!bootstrapped) {
    return (
      <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]" aria-busy="true">
        <div className="relative mb-[var(--r5-space-6)] overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/70 bg-gradient-to-br from-r5-surface-secondary/50 via-r5-surface-primary/35 to-r5-accent/[0.07] p-5 shadow-[var(--r5-shadow-elevated)] ring-1 ring-white/[0.04]">
          <FeedPersonalGreeting />
          <FeedExecutionSnapshot commitmentsCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-[var(--r5-radius-card)] bg-r5-border-subtle/35" />
        <div className="mt-[var(--r5-space-8)] space-y-[var(--r5-space-3)]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[var(--r5-radius-lg)] bg-r5-border-subtle/20"
            />
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] pb-[var(--r5-space-8)] pt-[var(--r5-space-5)] sm:px-[var(--r5-content-padding-x)] sm:pt-[var(--r5-space-6)]">
        <div className="relative mb-[var(--r5-space-6)] overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/70 bg-gradient-to-br from-r5-surface-secondary/50 via-r5-surface-primary/35 to-r5-accent/[0.07] p-5 shadow-[var(--r5-shadow-elevated)] ring-1 ring-white/[0.04]">
          <FeedPersonalGreeting />
          <FeedExecutionSnapshot commitmentsCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
        </div>
        <div className="flex min-h-[calc(100dvh-var(--r5-layout-chrome-vertical)-var(--r5-space-8))] flex-col items-center justify-center px-[var(--r5-space-2)] text-center">
        <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/80 bg-r5-surface-secondary/40 shadow-[var(--r5-shadow-elevated)] ring-1 ring-r5-accent/15">
          <span className="absolute inset-0 rounded-[var(--r5-radius-lg)] bg-gradient-to-br from-r5-accent/20 to-transparent opacity-80" aria-hidden />
          <Check className="relative h-9 w-9 text-r5-accent" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-[length:var(--r5-font-heading)] font-semibold tracking-tight text-r5-text-primary">
          No commitments yet
        </p>
        <p className="mt-2 max-w-md text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">
          Paste a meeting note or Slack message in Capture to get started.
        </p>
        <button
          type="button"
          onClick={() => openCapture()}
          className="mt-8 inline-flex items-center justify-center rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-8)] py-[var(--r5-space-3)] text-[length:var(--r5-font-subheading)] font-semibold text-r5-surface-primary shadow-[var(--r5-shadow-elevated)] transition hover:opacity-95 active:scale-[0.98]"
        >
          Open Capture
        </button>
        </div>
      </div>
    );
  }

  if (searchFiltered.length === 0 && feedSearch.trim()) {
    return (
      <div className="mx-auto min-h-[calc(100dvh-var(--r5-layout-chrome-vertical))] w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]">
        <div className="relative mb-[var(--r5-space-6)] overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/70 bg-gradient-to-br from-r5-surface-secondary/50 via-r5-surface-primary/35 to-r5-accent/[0.07] p-5 shadow-[var(--r5-shadow-elevated)] ring-1 ring-white/[0.04]">
          <FeedPersonalGreeting />
          <FeedExecutionSnapshot commitmentsCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
        </div>
        <FeedHeaderStrip
          feedSearch={feedSearch}
          setFeedSearch={setFeedSearch}
          searchInputRef={searchInputRef}
          feedFilter={feedFilter}
          setFeedFilter={setFeedFilter}
          feedSort={feedSort}
          setFeedSort={setFeedSort}
          onRefresh={onRefreshFeed}
          refreshing={refreshing}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[length:var(--r5-font-subheading)] font-medium text-r5-text-primary">
            No matches for &ldquo;{feedSearch.trim()}&rdquo;
          </p>
          <p className="mt-2 max-w-sm text-[length:var(--r5-font-body)] text-r5-text-secondary">
            Try another word, or search project titles and descriptions.
          </p>
          <button
            type="button"
            className="mt-6 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/60 px-[var(--r5-space-5)] py-[var(--r5-space-2)] text-[length:var(--r5-font-body)] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover"
            onClick={() => setFeedSearch("")}
          >
            Clear search
          </button>
        </div>
      </div>
    );
  }

  if (searchFiltered.length === 0 && filterActive) {
    return (
      <div className="mx-auto min-h-[calc(100dvh-var(--r5-layout-chrome-vertical))] w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]">
        <div className="relative mb-[var(--r5-space-6)] overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/70 bg-gradient-to-br from-r5-surface-secondary/50 via-r5-surface-primary/35 to-r5-accent/[0.07] p-5 shadow-[var(--r5-shadow-elevated)] ring-1 ring-white/[0.04]">
          <FeedPersonalGreeting />
          <FeedExecutionSnapshot commitmentsCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
        </div>
        <FeedHeaderStrip
          feedSearch={feedSearch}
          setFeedSearch={setFeedSearch}
          searchInputRef={searchInputRef}
          feedFilter={feedFilter}
          setFeedFilter={setFeedFilter}
          feedSort={feedSort}
          setFeedSort={setFeedSort}
          onRefresh={onRefreshFeed}
          refreshing={refreshing}
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[length:var(--r5-font-subheading)] font-medium text-r5-text-primary">
            No commitments match this filter
          </p>
          <button
            type="button"
            className="mt-4 text-[length:var(--r5-font-subheading)] text-r5-status-on-track underline-offset-4 hover:underline"
            onClick={() => {
              setFeedFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-[calc(100dvh-var(--r5-layout-chrome-vertical))] w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-5)] sm:px-[var(--r5-content-padding-x)] sm:py-[var(--r5-space-6)]">
      <div className="relative mb-[var(--r5-space-6)] overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/70 bg-gradient-to-br from-r5-surface-secondary/50 via-r5-surface-primary/35 to-r5-accent/[0.07] p-5 shadow-[var(--r5-shadow-elevated)] ring-1 ring-white/[0.04]">
        <FeedPersonalGreeting />
        <FeedExecutionSnapshot commitmentsCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
      </div>
      <FeedHeaderStrip
        feedSearch={feedSearch}
        setFeedSearch={setFeedSearch}
        searchInputRef={searchInputRef}
        feedFilter={feedFilter}
        setFeedFilter={setFeedFilter}
        feedSort={feedSort}
        setFeedSort={setFeedSort}
        onRefresh={onRefreshFeed}
        refreshing={refreshing}
      />

      {openCount === 0 && grouped.completed.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 rounded-[var(--r5-radius-lg)] border border-r5-status-completed/15 bg-r5-status-completed/10 px-6 py-4"
        >
          <p className="text-[length:var(--r5-font-subheading)] font-medium text-r5-text-primary">Everything is on track</p>
        </motion.div>
      ) : null}

      <div className="space-y-8">
        {FEED_BUCKETS.map((bucket) => {
          const list = grouped[bucket];
          if (list.length === 0) return null;

          if (bucket === "completed") {
            return (
              <FeedCompletedSection
                key={bucket}
                bucket={bucket}
                label={SECTION_LABEL[bucket]}
                rows={list}
                open={completedOpen}
                onToggle={() => setCompletedOpen((o) => !o)}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                details={details}
                popover={popover}
                setPopover={setPopover}
                popoverRef={popoverRef}
                selfId={selfId}
                selfDisplayName={selfDisplayName}
                selfInitials={selfInitials}
                justAddedIds={justAddedIds}
                completingId={completingId}
                markComplete={markComplete}
                dismissCommitment={dismissCommitment}
                saveTitle={saveTitle}
                saveDescription={saveDescription}
                saveOwner={saveOwner}
                saveDeadline={saveDeadline}
                savePriority={savePriority}
                saveProject={saveProject}
                postComment={postComment}
                projectNameById={projectNameById}
                projects={projects}
                searchQuery={feedSearch}
              />
            );
          }

          return (
            <FeedSectionStatic
              key={bucket}
              bucket={bucket}
              label={SECTION_LABEL[bucket]}
              rows={list}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              details={details}
              popover={popover}
              setPopover={setPopover}
              popoverRef={popoverRef}
              selfId={selfId}
              selfDisplayName={selfDisplayName}
              selfInitials={selfInitials}
              justAddedIds={justAddedIds}
              completingId={completingId}
              markComplete={markComplete}
              dismissCommitment={dismissCommitment}
              saveTitle={saveTitle}
              saveDescription={saveDescription}
              saveOwner={saveOwner}
              saveDeadline={saveDeadline}
              savePriority={savePriority}
              saveProject={saveProject}
              postComment={postComment}
              projectNameById={projectNameById}
              projects={projects}
              searchQuery={feedSearch}
            />
          );
        })}
      </div>
    </div>
  );
}

function FeedHeaderStrip({
  feedSearch,
  setFeedSearch,
  searchInputRef,
  feedFilter,
  setFeedFilter,
  feedSort,
  setFeedSort,
  onRefresh,
  refreshing,
}: {
  feedSearch: string;
  setFeedSearch: (s: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  feedFilter: FeedFilter;
  setFeedFilter: (f: FeedFilter) => void;
  feedSort: FeedSortUi;
  setFeedSort: (s: FeedSortUi) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    try {
      setGuideOpen(localStorage.getItem(FEED_GUIDE_KEY) !== "1");
    } catch {
      setGuideOpen(true);
    }
  }, []);

  function dismissGuide() {
    try {
      localStorage.setItem(FEED_GUIDE_KEY, "1");
    } catch {
      /* ignore */
    }
    setGuideOpen(false);
  }

  return (
    <header className="mb-[var(--r5-space-5)] w-full space-y-[var(--r5-space-4)]">
      {guideOpen ? (
        <div className="relative overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-accent/25 bg-gradient-to-br from-r5-accent/[0.09] via-r5-surface-secondary/40 to-r5-status-on-track/[0.06] px-[var(--r5-space-4)] py-[var(--r5-space-3)] shadow-[var(--r5-shadow-elevated)]">
          <button
            type="button"
            onClick={dismissGuide}
            className="absolute right-2 top-2 rounded-[var(--r5-radius-badge)] p-1 text-r5-text-tertiary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
            aria-label="Dismiss tips"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
          <p className="pr-8 text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-accent">
            How Feed works
          </p>
          <ul className="mt-2 flex list-none flex-col gap-1.5 text-[length:var(--r5-font-body)] text-r5-text-secondary sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
            <li className="flex gap-2">
              <span className="text-r5-accent" aria-hidden>
                1.
              </span>
              <span>
                <span className="font-medium text-r5-text-primary">Sync</span> updates the list and the KPI tiles above.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-r5-accent" aria-hidden>
                2.
              </span>
              <span>
                Use <span className="font-medium text-r5-text-primary">filters</span> to narrow owners — hover a pill for a short
                hint.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-r5-accent" aria-hidden>
                3.
              </span>
              <span>
                <span className="font-medium text-r5-text-primary">Expand a row</span> to edit owner, due date, or add a comment
                for your team.
              </span>
            </li>
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[length:var(--r5-font-hero)] font-semibold tracking-[-0.04em] text-r5-text-primary sm:text-[length:var(--r5-font-display)]">
            Feed
          </h1>
          <p className="mt-1 max-w-[52ch] text-[length:var(--r5-font-body)] text-r5-text-secondary">
            Your org’s commitments — newest context at the top. Filter by who owns what, sort by date or priority,{" "}
            <Link href="/workspace/team" className="font-medium text-r5-accent underline-offset-2 hover:underline">
              see who’s on the team
            </Link>
            , then search across titles and projects.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:max-w-[min(100%,320px)]">
          <label className="sr-only" htmlFor="feed-search-input">
            Search commitments
          </label>
          <div className="relative flex w-full items-center">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-r5-text-tertiary"
              strokeWidth={2}
              aria-hidden
            />
            <input
              id="feed-search-input"
              ref={searchInputRef}
              type="search"
              value={feedSearch}
              onChange={(e) => setFeedSearch(e.target.value)}
              placeholder="Search title, notes, project…"
              autoComplete="off"
              className="min-h-[40px] w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle/90 bg-r5-surface-primary/80 py-2 pl-10 pr-3 text-[length:var(--r5-font-body)] text-r5-text-primary shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] outline-none transition-[border-color,box-shadow] placeholder:text-r5-text-tertiary focus:border-r5-accent/40 focus:ring-2 focus:ring-r5-accent/20"
            />
          </div>
          <p className="text-[10px] text-r5-text-tertiary">
            Press <kbd className="rounded border border-r5-border-subtle bg-r5-surface-secondary/80 px-1 font-mono">/</kbd>{" "}
            to focus search
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-[var(--r5-space-3)]">
        <div className="flex flex-wrap items-center gap-[var(--r5-space-2)]">
          {FEED_FILTER_OPTIONS.map((opt) => {
            const active = opt.value === feedFilter;
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.hint}
                onClick={() => setFeedFilter(opt.value)}
                className={`min-h-[var(--r5-nav-item-height)] rounded-[var(--r5-radius-pill)] border px-[var(--r5-space-3)] text-[length:var(--r5-font-body)] transition-[background-color,color,border-color,transform] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] active:scale-[0.98] ${
                  active
                    ? "border-r5-accent/35 bg-r5-surface-secondary text-r5-text-primary shadow-[0_0_0_1px_rgba(167,139,250,0.12)]"
                    : "border-r5-border-subtle/60 bg-r5-surface-primary/60 text-r5-text-secondary hover:border-r5-border-subtle hover:bg-r5-surface-hover hover:text-r5-text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-[var(--r5-space-2)]">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-2 rounded-[var(--r5-radius-md)] border border-r5-border-subtle/70 bg-r5-surface-primary/80 px-[var(--r5-space-3)] text-[length:var(--r5-font-body)] text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary disabled:opacity-50"
            aria-label="Sync feed and workspace metrics"
            title="Reload commitments and KPI tiles"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <select
            value={feedSort}
            onChange={(e) => setFeedSort(e.target.value as FeedSortUi)}
            className="min-h-[var(--r5-nav-item-height)] cursor-pointer rounded-[var(--r5-radius-md)] border border-r5-border-subtle/70 bg-r5-surface-primary/80 px-[var(--r5-space-3)] text-[length:var(--r5-font-body)] font-medium text-r5-text-primary outline-none focus:ring-2 focus:ring-r5-accent/25"
            aria-label="Sort"
          >
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
            <option value="owner">Owner</option>
            <option value="updated">Recently updated</option>
            <option value="created">Date created</option>
          </select>
        </div>
      </div>
    </header>
  );
}

function sectionCountClass(bucket: FeedBucket): string {
  if (bucket === "overdue") return "text-r5-status-overdue";
  if (bucket === "today") return "text-r5-status-at-risk";
  return "text-r5-text-secondary";
}

function bucketListAccent(bucket: FeedBucket): string {
  switch (bucket) {
    case "overdue":
      return "border-l-[3px] border-l-r5-status-overdue";
    case "today":
      return "border-l-[3px] border-l-r5-status-at-risk";
    case "week":
      return "border-l-[3px] border-l-r5-status-on-track";
    case "later":
      return "border-l-[3px] border-l-r5-text-tertiary/50";
    case "completed":
      return "border-l-[3px] border-l-r5-status-completed";
    default:
      return "";
  }
}

function FeedSectionStatic({
  bucket,
  label,
  rows,
  expandedId,
  setExpandedId,
  details,
  popover,
  setPopover,
  popoverRef,
  selfId,
  selfDisplayName,
  selfInitials,
  justAddedIds,
  completingId,
  markComplete,
  dismissCommitment,
  saveTitle,
  saveDescription,
  saveOwner,
  saveDeadline,
  savePriority,
  saveProject,
  postComment,
  projectNameById,
  projects,
  searchQuery,
}: {
  bucket: FeedBucket;
  label: string;
  rows: OrgCommitmentRow[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  details: Record<string, OrgCommitmentDetail | undefined>;
  popover: { type: "owner" | "due"; commitmentId: string; draft: string } | null;
  setPopover: React.Dispatch<
    React.SetStateAction<{ type: "owner" | "due"; commitmentId: string; draft: string } | null>
  >;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  selfId: string | undefined;
  selfDisplayName: string;
  selfInitials: string;
  justAddedIds: Set<string>;
  completingId: string | null;
  markComplete: (id: string, e?: React.MouseEvent) => void;
  dismissCommitment: (id: string, e: React.MouseEvent) => void;
  saveTitle: (id: string, title: string) => void;
  saveDescription: (id: string, description: string | null) => void;
  saveOwner: (id: string, ownerId: string) => void;
  saveDeadline: (id: string, iso: string) => void;
  savePriority: (id: string, priority: OrgCommitmentRow["priority"]) => void;
  saveProject: (id: string, projectId: string | null) => void;
  postComment: (id: string, content: string) => void;
  projectNameById: Map<string, string>;
  projects: { id: string; name: string }[];
  searchQuery: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3 px-0.5">
        <h2 className="text-[length:var(--r5-font-body)] font-semibold tracking-wide text-r5-text-primary">
          {label}
        </h2>
        <span className={`text-[length:var(--r5-font-body)] font-medium tabular-nums ${sectionCountClass(bucket)}`}>
          {rows.length}
        </span>
      </div>
      <ul
        className={`overflow-visible rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/60 bg-r5-surface-primary/25 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${bucketListAccent(bucket)}`}
      >
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <FeedRow
              key={row.id}
              bucket={bucket}
              row={row}
              expanded={expandedId === row.id}
              onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              detail={details[row.id]}
              popover={popover}
              setPopover={setPopover}
              popoverRef={popoverRef}
              selfId={selfId}
              selfDisplayName={selfDisplayName}
              selfInitials={selfInitials}
              justAdded={justAddedIds.has(row.id)}
              completingId={completingId}
              markComplete={markComplete}
              dismissCommitment={dismissCommitment}
              saveTitle={saveTitle}
              saveDescription={saveDescription}
              saveOwner={saveOwner}
              saveDeadline={saveDeadline}
              savePriority={savePriority}
              saveProject={saveProject}
              postComment={postComment}
              projectNameById={projectNameById}
              projects={projects}
              searchQuery={searchQuery}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function FeedCompletedSection({
  bucket,
  label,
  rows,
  open,
  onToggle,
  expandedId,
  setExpandedId,
  details,
  popover,
  setPopover,
  popoverRef,
  selfId,
  selfDisplayName,
  selfInitials,
  justAddedIds,
  completingId,
  markComplete,
  dismissCommitment,
  saveTitle,
  saveDescription,
  saveOwner,
  saveDeadline,
  savePriority,
  saveProject,
  postComment,
  projectNameById,
  projects,
  searchQuery,
}: {
  bucket: FeedBucket;
  label: string;
  rows: OrgCommitmentRow[];
  open: boolean;
  onToggle: () => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  details: Record<string, OrgCommitmentDetail | undefined>;
  popover: { type: "owner" | "due"; commitmentId: string; draft: string } | null;
  setPopover: React.Dispatch<
    React.SetStateAction<{ type: "owner" | "due"; commitmentId: string; draft: string } | null>
  >;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  selfId: string | undefined;
  selfDisplayName: string;
  selfInitials: string;
  justAddedIds: Set<string>;
  completingId: string | null;
  markComplete: (id: string, e?: React.MouseEvent) => void;
  dismissCommitment: (id: string, e: React.MouseEvent) => void;
  saveTitle: (id: string, title: string) => void;
  saveDescription: (id: string, description: string | null) => void;
  saveOwner: (id: string, ownerId: string) => void;
  saveDeadline: (id: string, iso: string) => void;
  savePriority: (id: string, priority: OrgCommitmentRow["priority"]) => void;
  saveProject: (id: string, projectId: string | null) => void;
  postComment: (id: string, content: string) => void;
  projectNameById: Map<string, string>;
  projects: { id: string; name: string }[];
  searchQuery: string;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 flex w-full items-baseline justify-between gap-3 px-0.5 text-left transition hover:opacity-90"
      >
        <span className="flex items-center gap-2 text-[length:var(--r5-font-body)] font-semibold tracking-wide text-r5-text-primary">
          {open ? (
            <ChevronDown className="h-4 w-4 text-r5-text-secondary" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 text-r5-text-secondary" aria-hidden />
          )}
          {label}
        </span>
        <span className={`text-[length:var(--r5-font-body)] font-medium tabular-nums ${sectionCountClass(bucket)}`}>
          {rows.length}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/60 bg-r5-surface-primary/20 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${bucketListAccent(bucket)}`}
          >
            {rows.map((row) => (
              <FeedRow
                key={row.id}
                bucket={bucket}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                detail={details[row.id]}
                popover={popover}
                setPopover={setPopover}
                popoverRef={popoverRef}
                selfId={selfId}
                selfDisplayName={selfDisplayName}
                selfInitials={selfInitials}
                justAdded={justAddedIds.has(row.id)}
                completingId={completingId}
                markComplete={markComplete}
                dismissCommitment={dismissCommitment}
                saveTitle={saveTitle}
                saveDescription={saveDescription}
                saveOwner={saveOwner}
                saveDeadline={saveDeadline}
                savePriority={savePriority}
                saveProject={saveProject}
                postComment={postComment}
                projectNameById={projectNameById}
                projects={projects}
                searchQuery={searchQuery}
              />
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function FeedRow({
  bucket,
  row,
  expanded,
  onToggle,
  detail,
  popover,
  setPopover,
  popoverRef,
  selfId,
  selfDisplayName,
  selfInitials,
  justAdded,
  completingId,
  markComplete,
  dismissCommitment,
  saveTitle,
  saveDescription,
  saveOwner,
  saveDeadline,
  savePriority,
  saveProject,
  postComment,
  projectNameById,
  projects,
  searchQuery,
}: {
  bucket: FeedBucket;
  row: OrgCommitmentRow;
  expanded: boolean;
  onToggle: () => void;
  detail: OrgCommitmentDetail | undefined;
  popover: { type: "owner" | "due"; commitmentId: string; draft: string } | null;
  setPopover: React.Dispatch<
    React.SetStateAction<{ type: "owner" | "due"; commitmentId: string; draft: string } | null>
  >;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  selfId: string | undefined;
  selfDisplayName: string;
  selfInitials: string;
  justAdded: boolean;
  completingId: string | null;
  markComplete: (id: string, e?: React.MouseEvent) => void;
  dismissCommitment: (id: string, e: React.MouseEvent) => void;
  saveTitle: (id: string, title: string) => void;
  saveDescription: (id: string, description: string | null) => void;
  saveOwner: (id: string, ownerId: string) => void;
  saveDeadline: (id: string, iso: string) => void;
  savePriority: (id: string, priority: OrgCommitmentRow["priority"]) => void;
  saveProject: (id: string, projectId: string | null) => void;
  postComment: (id: string, content: string) => void;
  projectNameById: Map<string, string>;
  projects: { id: string; name: string }[];
  searchQuery: string;
}) {
  const completed = isCompletedRow(row);
  const completing = completingId === row.id;
  const unassigned = isUnassignedOwner(row.ownerId);
  const [titleDraft, setTitleDraft] = useState(row.title);
  const [descDraft, setDescDraft] = useState(row.description ?? "");
  const [commentDraft, setCommentDraft] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const ownerBtnRef = useRef<HTMLButtonElement>(null);
  const dueBtnRef = useRef<HTMLButtonElement>(null);
  const [popFixed, setPopFixed] = useState<{
    kind: "owner" | "due";
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    setTitleDraft(row.title);
    setDescDraft(row.description ?? "");
  }, [row.title, row.description, row.id]);

  const showPopover = popover?.commitmentId === row.id ? popover : null;

  useLayoutEffect(() => {
    if (!showPopover) {
      setPopFixed(null);
      return;
    }
    const place = () => {
      if (showPopover.type === "owner" && ownerBtnRef.current) {
        const r = ownerBtnRef.current.getBoundingClientRect();
        setPopFixed({
          kind: "owner",
          top: r.bottom + 8,
          left: Math.max(8, Math.min(r.left, window.innerWidth - 292)),
        });
      } else if (showPopover.type === "due" && dueBtnRef.current) {
        const r = dueBtnRef.current.getBoundingClientRect();
        setPopFixed({
          kind: "due",
          top: r.bottom + 8,
          left: Math.max(8, Math.min(r.left, window.innerWidth - 280)),
        });
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [showPopover]);

  const overdueBorder = !completed && row.status === "overdue";
  const dimLater = bucket === "later" && !completed;
  const dueLabel = formatFeedDueLabel(row.deadline);
  const missingDue = isMissingDeadline(row.deadline);

  const ownerPopoverOpen =
    Boolean(popFixed?.kind === "owner" && showPopover?.type === "owner");
  const duePopoverOpen = Boolean(popFixed?.kind === "due" && showPopover?.type === "due");

  return (
    <>
    <motion.li
      layout
      initial={
        justAdded
          ? { opacity: 0, y: -14, scale: 0.98 }
          : { opacity: 0, y: -6 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: justAdded ? 0.45 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`group border-b border-r5-border-subtle/40 last:border-b-0 ${
        overdueBorder ? "border-l-2 border-l-r5-status-overdue" : ""
      } ${dimLater ? "opacity-[0.72]" : ""} ${completed ? "opacity-60" : ""} ${
        justAdded ? "ring-1 ring-r5-status-on-track/35 ring-inset" : ""
      }`}
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!touchStart.current || completed) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.current.x;
        const dy = Math.abs(t.clientY - touchStart.current.y);
        touchStart.current = null;
        if (dy > 40) return;
        if (dx > 70) void markComplete(row.id);
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="w-full cursor-pointer px-3 py-2.5 text-left outline-none transition-colors duration-[var(--r5-duration-fast)] hover:bg-r5-surface-hover/40 focus-visible:ring-2 focus-visible:ring-r5-accent/35 sm:px-4 sm:py-3"
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex shrink-0 items-start gap-2 pt-0.5">
            <div
              className={`mt-1.5 h-4 shrink-0 rounded-[var(--r5-radius-pill)] ${priorityBarTone(row.priority).show ? "w-0.5" : "w-0"} ${priorityBarTone(row.priority).className}`}
              aria-hidden
            />
            <button
              type="button"
              title={completed ? "Completed" : "Mark complete"}
              disabled={completed || completing}
              onClick={(e) => void markComplete(row.id, e)}
              className={`relative mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-[var(--r5-radius-pill)] border-2 transition ${
                completing || completed
                  ? "border-r5-status-completed bg-r5-status-completed"
                  : circleTone(row.status, false)
              } ${completed || completing ? "" : "hover:scale-110 active:scale-95"}`}
            >
              {completing || completed ? (
                <Check className="h-2 w-2 text-r5-text-primary" strokeWidth={3} />
              ) : null}
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <p
                className={`min-w-0 flex-1 text-[length:var(--r5-font-subheading)] font-medium leading-snug text-r5-text-primary ${
                  completing || completed ? "line-through decoration-r5-text-secondary" : ""
                }`}
              >
                <HighlightedTitle text={row.title} query={searchQuery} />
              </p>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
                <button
                  type="button"
                  title="Edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                  className="rounded-[var(--r5-radius-card)] p-1.5 text-r5-text-secondary hover:bg-r5-surface-hover hover:text-r5-text-primary"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  title="Reassign"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopover({ type: "owner", commitmentId: row.id, draft: row.ownerId });
                  }}
                  className="rounded-[var(--r5-radius-card)] p-1.5 text-r5-text-secondary hover:bg-r5-surface-hover hover:text-r5-text-primary"
                >
                  <User className="h-4 w-4" aria-hidden />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    title="More"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((m) => !m);
                    }}
                    className="rounded-[var(--r5-radius-card)] p-1.5 text-r5-text-secondary hover:bg-r5-surface-hover hover:text-r5-text-primary"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen ? (
                    <div
                      className="absolute right-0 top-full z-30 mt-[var(--r5-space-2)] min-w-[var(--r5-popover-min-width)] rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary py-[var(--r5-space-2)] shadow-[var(--r5-shadow-elevated)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[length:var(--r5-font-body)] text-r5-status-overdue hover:bg-r5-status-overdue/10"
                        onClick={(e) => {
                          setMenuOpen(false);
                          void dismissCommitment(row.id, e);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[length:var(--r5-font-body)] text-r5-text-secondary">
              <button
                ref={ownerBtnRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopover({ type: "owner", commitmentId: row.id, draft: row.ownerId });
                }}
                title={ownerHoverLabelFromId(row.ownerId, selfId, selfDisplayName)}
                aria-expanded={ownerPopoverOpen}
                className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--r5-radius-pill)] py-0.5 text-left transition hover:text-r5-text-primary"
              >
                {unassigned ? (
                  <>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r5-radius-pill)] border border-dashed border-r5-border-subtle bg-r5-surface-secondary/50">
                      <Plus className="h-3 w-3 text-r5-text-secondary" />
                    </span>
                    <span className="text-r5-status-at-risk">Unassigned</span>
                  </>
                ) : (
                  <>
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r5-radius-pill)] text-[length:var(--r5-font-kbd)] font-semibold text-white"
                      style={{ backgroundColor: ownerAccentBg(row.ownerId) }}
                    >
                      {ownerInitialsFromId(row.ownerId, selfId, selfDisplayName, selfInitials)}
                    </span>
                    <span className="min-w-0 truncate sm:max-w-[220px]">
                      {ownerHoverLabelFromId(row.ownerId, selfId, selfDisplayName)}
                    </span>
                  </>
                )}
              </button>

              <button
                ref={dueBtnRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopover({
                    type: "due",
                    commitmentId: row.id,
                    draft: missingDue ? "" : row.deadline.slice(0, 10),
                  });
                }}
                aria-expanded={duePopoverOpen}
                className={`inline-flex items-center gap-1 rounded-md py-0.5 transition hover:text-r5-text-primary ${
                  missingDue ? "text-r5-status-at-risk" : ""
                } ${!missingDue && !completed && row.status === "overdue" ? "text-r5-status-overdue" : ""}`}
              >
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="whitespace-nowrap">{missingDue ? "Set deadline" : dueLabel}</span>
              </button>

              {row.projectId ? (
                <Link
                  href={`/projects/${row.projectId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle/60 bg-r5-surface-secondary/30 px-2.5 py-0.5 text-[length:var(--r5-font-caption)] font-medium text-r5-text-secondary transition hover:border-r5-border-subtle hover:text-r5-text-primary"
                >
                  {projectNameById.get(row.projectId) ?? "Project"}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-r5-border-subtle/35 bg-r5-surface-secondary/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <label className="block text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                Title
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (titleDraft.trim() && titleDraft.trim() !== row.title) {
                      void saveTitle(row.id, titleDraft.trim());
                    }
                  }}
                  className="mt-1 w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-3 py-2 text-[length:var(--r5-font-subheading)] text-r5-text-primary"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                  Priority
                  <select
                    value={row.priority}
                    onChange={(e) =>
                      void savePriority(row.id, e.target.value as OrgCommitmentRow["priority"])
                    }
                    className="mt-1 w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-3 py-2 text-[length:var(--r5-font-body)] text-r5-text-primary"
                  >
                    {(["critical", "high", "medium", "low"] as const).map((p) => (
                      <option key={p} value={p}>
                        {ORG_PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                  Project
                  <select
                    value={row.projectId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      void saveProject(row.id, v === "" ? null : v);
                    }}
                    className="mt-1 w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-3 py-2 text-[length:var(--r5-font-body)] text-r5-text-primary"
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                Due date &amp; time
                <input
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(row.deadline)}
                  key={row.deadline}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const iso = new Date(v).toISOString();
                    if (iso !== row.deadline) void saveDeadline(row.id, iso);
                  }}
                  className="mt-1 w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-3 py-2 text-[length:var(--r5-font-body)] text-r5-text-primary"
                />
              </label>

              <label className="block text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                Description
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={() => {
                    const next = descDraft.trim() || null;
                    if (next !== (row.description ?? null)) void saveDescription(row.id, next);
                  }}
                  rows={4}
                  className="mt-1 w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-3 py-2 text-[length:var(--r5-font-body)] text-r5-text-primary"
                />
              </label>

              <div>
                <p className="text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                  Source
                </p>
                {row.description?.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSourceOpen((o) => !o)}
                    className="mt-2 w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/40 px-3 py-2 text-left text-[length:var(--r5-font-body)] text-r5-text-secondary transition hover:bg-r5-surface-primary/60"
                  >
                    {sourceOpen ? (
                      <span className="whitespace-pre-wrap text-r5-text-primary">{row.description}</span>
                    ) : (
                      <span className="line-clamp-2">{row.description}</span>
                    )}
                  </button>
                ) : (
                  <p className="mt-2 text-[length:var(--r5-font-body)] text-r5-text-secondary">
                    No captured source text for this commitment.
                  </p>
                )}
              </div>

              {detail?.history?.length ? (
                <div>
                  <p className="text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                    Activity
                  </p>
                  <ul className="mt-3 space-y-2">
                    {detail.history.map((h) => (
                      <li key={h.id} className="text-[length:var(--r5-font-body)] leading-relaxed text-r5-text-primary">
                        <span className="text-r5-text-secondary">
                          {new Date(h.changedAt).toLocaleString()} ·{" "}
                        </span>
                        {historyFieldLabel(h.fieldChanged)}:{" "}
                        <span className="text-r5-text-secondary">{h.oldValue ?? "—"}</span>
                        {" → "}
                        <span>{h.newValue ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : expanded && !detail ? (
                <p className="text-[length:var(--r5-font-body)] text-r5-text-secondary">Loading detail…</p>
              ) : null}

              <div>
                <p className="flex items-center gap-1.5 text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  Comments
                </p>
                <ul className="mt-2 space-y-2">
                  {(detail?.comments ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/50 bg-r5-surface-primary/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r5-radius-pill)] text-[length:var(--r5-font-kbd)] font-semibold text-white"
                          style={{ backgroundColor: ownerAccentBg(c.userId) }}
                        >
                          {ownerInitialsFromId(c.userId, selfId, selfDisplayName, selfInitials)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[length:var(--r5-font-caption)] font-medium text-r5-text-primary">
                            {ownerHoverLabelFromId(c.userId, selfId, selfDisplayName)}
                          </p>
                          <p className="text-[length:var(--r5-font-kbd)] text-r5-text-secondary">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-[length:var(--r5-font-body)] leading-relaxed text-r5-text-primary">{c.content}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Add a comment…"
                    className="min-w-0 flex-1 rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-3 py-2 text-[length:var(--r5-font-body)] text-r5-text-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const t = commentDraft.trim();
                        if (t) {
                          void postComment(row.id, t);
                          setCommentDraft("");
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>

    {typeof document !== "undefined" && ownerPopoverOpen && popFixed?.kind === "owner" && showPopover?.type === "owner"
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Assign owner"
            style={{
              position: "fixed",
              top: popFixed.top,
              left: popFixed.left,
              zIndex: 400,
            }}
            className="w-[min(calc(100vw-var(--r5-space-4)),var(--r5-popover-max-width))] rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary p-[var(--r5-space-3)] shadow-[var(--r5-shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
              Assign owner
            </p>
            <p className="mt-1 text-[length:var(--r5-font-caption)] leading-snug text-r5-text-secondary">
              Clerk user id for someone in your workspace.
            </p>
            <input
              value={showPopover.draft}
              onChange={(e) =>
                setPopover({ type: "owner", commitmentId: row.id, draft: e.target.value })
              }
              className="mt-2 w-full rounded-[var(--r5-radius-card)] border border-r5-border-subtle bg-r5-surface-secondary px-2 py-1.5 font-mono text-[length:var(--r5-font-caption)] text-r5-text-primary"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPopover(null)}
                className="text-[length:var(--r5-font-body)] text-r5-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveOwner(row.id, showPopover.draft.trim());
                }}
                className="rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-3)] py-[var(--r5-space-2)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary"
              >
                Save
              </button>
            </div>
          </div>,
          document.body
        )
      : null}

    {typeof document !== "undefined" && duePopoverOpen && popFixed?.kind === "due" && showPopover?.type === "due"
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Set due date"
            style={{
              position: "fixed",
              top: popFixed.top,
              left: popFixed.left,
              zIndex: 400,
            }}
            className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary p-[var(--r5-space-3)] shadow-[var(--r5-shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="date"
              value={showPopover.draft}
              onChange={(e) =>
                setPopover({ type: "due", commitmentId: row.id, draft: e.target.value })
              }
              className="rounded-[var(--r5-radius-card)] border border-r5-border-subtle bg-r5-surface-secondary px-2 py-1 text-[length:var(--r5-font-body)] text-r5-text-primary"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPopover(null)}
                className="text-[length:var(--r5-font-body)] text-r5-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showPopover.draft) {
                    void saveDeadline(row.id, `${showPopover.draft}T12:00:00.000Z`);
                  }
                }}
                className="rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-3)] py-[var(--r5-space-2)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary"
              >
                Save
              </button>
            </div>
          </div>,
          document.body
        )
      : null}
  </>
  );
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

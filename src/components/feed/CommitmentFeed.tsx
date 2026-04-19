"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
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
import MemberAvatar from "@/components/people/MemberAvatar";
import MemberProfilePeek from "@/components/people/MemberProfilePeek";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";
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
import FeedPersonalGreeting from "@/components/feed/FeedPersonalGreeting";
import { useCapture } from "@/components/capture/CaptureProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  clerkDisplayName,
  clerkSelfInitials,
  ownerHoverLabelFromId,
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

type FeedSortUi = "due" | "priority" | "owner" | "updated" | "risk";
type FeedGroupMode = "timeline" | "owner" | "status";

const FEED_VIEW_STORAGE_KEY = "route5:feed-saved-views:v1";
const FEED_CACHE_KEY = "route5:feed-cache:v1";
const FEED_DENSITY_KEY = "route5:feed-density:v1";
const ACTIVE_PROJECT_STORAGE_KEY = "route5.headerProjectId";

type FeedSavedView = {
  id: string;
  label: string;
  filter: FeedFilter;
  sort: FeedSortUi;
  group: FeedGroupMode;
  search: string;
};

type FeedDensity = "comfortable" | "compact";

const FEED_FILTER_OPTIONS: readonly { value: FeedFilter; label: string; hint: string }[] = [
  { value: "all", label: "All", hint: "Every open commitment in this workspace" },
  { value: "mine", label: "Mine", hint: "Owned by you" },
  { value: "team", label: "My Team", hint: "Commitments owned by teammates" },
  { value: "unassigned", label: "Unassigned", hint: "No owner set yet" },
  { value: "overdue", label: "Overdue", hint: "Past deadline and not done" },
];

function sortApiParams(ui: FeedSortUi): { sort: OrgCommitmentListSort; order: "asc" | "desc" } {
  switch (ui) {
    case "priority":
      return { sort: "priority", order: "asc" };
    case "owner":
      return { sort: "owner_id", order: "asc" };
    case "updated":
      return { sort: "updated_at", order: "desc" };
    case "risk":
      return { sort: "deadline", order: "asc" };
    case "due":
    default:
      return { sort: "deadline", order: "asc" };
  }
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

function relativeTimeLabel(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}h ago`;
  return `${Math.max(1, Math.floor(diff / 86_400_000))}d ago`;
}

function downloadFeedCsv(rows: OrgCommitmentRow[], projectNameById: Map<string, string>) {
  const header = ["title", "ownerId", "status", "priority", "deadline", "project", "updatedAt"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.title,
      r.ownerId,
      r.status,
      r.priority,
      r.deadline,
      r.projectId ? projectNameById.get(r.projectId) ?? "" : "",
      r.updatedAt,
    ]
      .map((v) => esc(v ?? ""))
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `route5-feed-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sourceLabelFromDescription(description: string | null): string | null {
  if (!description) return null;
  const firstLine = description.split("\n")[0]?.trim() ?? "";
  const m = /^[-\u2014]\s*source\s*\(([^)]+)\)\s*[-\u2014]\s*$/i.exec(firstLine);
  if (!m?.[1]) return null;
  return m[1].trim();
}

function isLikelyAtRisk(row: OrgCommitmentRow): { risky: boolean; reason: string | null } {
  if (isCompletedRow(row)) return { risky: false, reason: null };
  if (row.status === "overdue") return { risky: true, reason: "Deadline passed" };
  if (row.status === "at_risk") return { risky: true, reason: "Flagged as at risk" };
  const deadlineMs = new Date(row.deadline).getTime();
  const lastActivityMs = new Date(row.lastActivityAt).getTime();
  const now = Date.now();
  const hoursToDeadline = (deadlineMs - now) / 3_600_000;
  const hoursSinceActivity = (now - lastActivityMs) / 3_600_000;
  if (hoursToDeadline <= 48 && hoursSinceActivity >= 72) {
    return { risky: true, reason: "No recent activity close to deadline" };
  }
  return { risky: false, reason: null };
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

function FeedHeroSummary({
  activeCount,
  overdueCount,
  completedThisWeek,
}: {
  activeCount: number;
  overdueCount: number;
  completedThisWeek: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] font-medium text-r5-text-secondary">
      <span className="text-r5-text-primary">{activeCount} Active</span>
      <span className={overdueCount > 0 ? "text-r5-status-overdue" : "text-r5-text-secondary"}>
        {overdueCount} Overdue
      </span>
      <span>{completedThisWeek} Done this week</span>
    </div>
  );
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
  const [groupMode, setGroupMode] = useState<FeedGroupMode>("timeline");
  const [feedSearch, setFeedSearch] = useState("");
  const deferredFeedSearch = useDeferredValue(feedSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowButtonRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastLoadMs, setLastLoadMs] = useState<number | null>(null);
  const [savedViews, setSavedViews] = useState<FeedSavedView[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [collapsedBuckets, setCollapsedBuckets] = useState<Partial<Record<FeedBucket, boolean>>>({});
  const [density, setDensity] = useState<FeedDensity>("comfortable");
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [popover, setPopover] = useState<
    | { type: "owner" | "due"; commitmentId: string; draft: string }
    | null
  >(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const rowIdsSeen = useRef<Set<string>>(new Set());
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const { sort: apiSort, order: apiOrder } = sortApiParams(feedSort);
  const feedCacheKey = useMemo(
    () => `${FEED_CACHE_KEY}:${activeProjectId ?? "all"}`,
    [activeProjectId]
  );
  const listAbortRef = useRef<AbortController | null>(null);

  const loadList = useCallback(async () => {
    const prev = listAbortRef.current;
    if (prev && !prev.signal.aborted) prev.abort("feed-refresh");
    const ctrl = new AbortController();
    listAbortRef.current = ctrl;
    try {
      const started = performance.now();
      const sp = new URLSearchParams();
      sp.set("sort", apiSort);
      sp.set("order", apiOrder);
      if (activeProjectId) sp.set("projectId", activeProjectId);
      const res = await fetch(`/api/commitments?${sp.toString()}`, {
        credentials: "same-origin",
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        orgId?: string;
        commitments?: OrgCommitmentRow[];
      };
      if (ctrl.signal.aborted) return;
      if (res.ok) {
        if (data.orgId) setOrgId(data.orgId);
        const nextRows = data.commitments ?? [];
        const syncedAt = new Date().toISOString();
        setRows(nextRows);
        setLastSyncAt(syncedAt);
        setLastLoadMs(Math.round(performance.now() - started));
        try {
          sessionStorage.setItem(feedCacheKey, JSON.stringify({ rows: nextRows, at: syncedAt }));
        } catch {
          /* ignore */
        }
      }
      setBootstrapped(true);
    } catch {
      if (ctrl.signal.aborted) return;
      setBootstrapped(true);
    } finally {
      if (listAbortRef.current === ctrl) listAbortRef.current = null;
    }
  }, [apiSort, apiOrder, activeProjectId, feedCacheKey]);

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
    try {
      const raw = sessionStorage.getItem(FEED_CACHE_KEY);
      const scopedRaw = sessionStorage.getItem(feedCacheKey);
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw) as { rows?: OrgCommitmentRow[]; at?: string };
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          setRows(parsed.rows);
          setBootstrapped(true);
          if (parsed.at) setLastSyncAt(parsed.at);
          return;
        }
      }
      if (!raw) return;
      const parsed = JSON.parse(raw) as { rows?: OrgCommitmentRow[]; at?: string };
      if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
        setRows(parsed.rows);
        setBootstrapped(true);
        if (parsed.at) setLastSyncAt(parsed.at);
      }
    } catch {
      /* ignore */
    }
  }, [feedCacheKey]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(
    () => () => {
      const ctrl = listAbortRef.current;
      if (ctrl && !ctrl.signal.aborted) ctrl.abort("feed-unmount");
      listAbortRef.current = null;
    },
    []
  );

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

  useEffect(() => {
    const readScope = () => {
      try {
        const raw = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
        setActiveProjectId(raw && raw.trim() ? raw.trim() : null);
      } catch {
        setActiveProjectId(null);
      }
    };
    readScope();
    const onScopeChanged = () => readScope();
    window.addEventListener("route5:project-scope-changed", onScopeChanged);
    window.addEventListener("storage", onScopeChanged);
    return () => {
      window.removeEventListener("route5:project-scope-changed", onScopeChanged);
      window.removeEventListener("storage", onScopeChanged);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FEED_VIEW_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FeedSavedView[];
      if (Array.isArray(parsed)) setSavedViews(parsed.slice(0, 3));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FEED_VIEW_STORAGE_KEY, JSON.stringify(savedViews.slice(0, 3)));
    } catch {
      /* ignore */
    }
  }, [savedViews]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FEED_DENSITY_KEY);
      if (raw === "compact" || raw === "comfortable") setDensity(raw);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FEED_DENSITY_KEY, density);
    } catch {
      /* ignore */
    }
  }, [density]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("route5:feed-auto-refresh:v1");
      if (v === "off") setAutoRefresh(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("route5:feed-auto-refresh:v1", autoRefresh ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = window.setInterval(() => {
      void loadList();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [autoRefresh, loadList]);

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

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

  const prefetchDetail = useCallback(
    (id: string) => {
      if (details[id]) return;
      void loadDetail(id);
    },
    [details, loadDetail]
  );

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
    const onExternalCommitmentChange = () => {
      void loadList();
      void refreshSummary();
      void loadProjects();
    };
    window.addEventListener("route5:commitments-changed", onExternalCommitmentChange);
    window.addEventListener("route5:project-updated", onExternalCommitmentChange);
    return () => {
      window.removeEventListener("route5:commitments-changed", onExternalCommitmentChange);
      window.removeEventListener("route5:project-updated", onExternalCommitmentChange);
    };
  }, [loadList, refreshSummary, loadProjects]);

  useEffect(() => {
    let t: number | undefined;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        void loadList();
        void refreshSummary();
      }, 350);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(t);
    };
  }, [loadList, refreshSummary]);

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
    const q = deferredFeedSearch.trim().toLowerCase();
    const base = !q
      ? filterOnlyRows
      : filterOnlyRows.filter((r) => {
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.description?.toLowerCase().includes(q)) return true;
      const pn = r.projectId ? projectNameById.get(r.projectId) : undefined;
      if (pn?.toLowerCase().includes(q)) return true;
      return false;
    });
    if (feedSort !== "risk") return base;
    return [...base].sort((a, b) => {
      const ar = isLikelyAtRisk(a);
      const br = isLikelyAtRisk(b);
      if (ar.risky !== br.risky) return ar.risky ? -1 : 1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [filterOnlyRows, deferredFeedSearch, projectNameById, feedSort]);

  const grouped = useMemo(() => groupFeedRows(searchFiltered), [searchFiltered]);
  const groupedByOwner = useMemo(() => {
    const m = new Map<string, OrgCommitmentRow[]>();
    for (const row of searchFiltered) {
      const key = row.ownerId.trim() || "unassigned";
      const list = m.get(key) ?? [];
      list.push(row);
      m.set(key, list);
    }
    return [...m.entries()].sort((a, b) => {
      const aOverdue = a[1].filter((r) => !isCompletedRow(r) && r.status === "overdue").length;
      const bOverdue = b[1].filter((r) => !isCompletedRow(r) && r.status === "overdue").length;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      return b[1].length - a[1].length;
    });
  }, [searchFiltered]);

  const groupedByStatus = useMemo(() => {
    const lanes: {
      key: "overdue" | "at_risk" | "in_progress" | "not_started" | "completed";
      label: string;
      rows: OrgCommitmentRow[];
    }[] = [
      { key: "overdue", label: "Overdue", rows: [] },
      { key: "at_risk", label: "At risk", rows: [] },
      { key: "in_progress", label: "In progress", rows: [] },
      { key: "not_started", label: "Not started", rows: [] },
      { key: "completed", label: "Completed", rows: [] },
    ];
    const byKey = new Map(lanes.map((l) => [l.key, l]));
    for (const row of searchFiltered) {
      const key = isCompletedRow(row)
        ? "completed"
        : row.status === "overdue"
          ? "overdue"
          : row.status === "at_risk"
            ? "at_risk"
            : row.status === "in_progress"
              ? "in_progress"
              : "not_started";
      byKey.get(key)?.rows.push(row);
    }
    return lanes;
  }, [searchFiltered]);

  const focusLane = useMemo(() => {
    return filterOnlyRows
      .filter((r) => !isCompletedRow(r))
      .map((row) => {
        const dueMs = new Date(row.deadline).getTime();
        const hoursToDue = Number.isFinite(dueMs) ? (dueMs - nowMs) / 3_600_000 : Number.POSITIVE_INFINITY;
        const riskBoost = row.status === "overdue" ? 6 : row.status === "at_risk" ? 4 : 0;
        const ownerMissing = isUnassignedOwner(row.ownerId) ? 2 : 0;
        const staleHours = (nowMs - new Date(row.lastActivityAt).getTime()) / 3_600_000;
        const staleBoost = staleHours >= 72 ? 2 : 0;
        const dueBoost = hoursToDue <= 24 ? 3 : hoursToDue <= 72 ? 2 : 0;
        return { row, score: riskBoost + ownerMissing + staleBoost + dueBoost };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [filterOnlyRows, nowMs]);

  const ownerTrendByOwnerId = useMemo(() => {
    const ownerMap = new Map<string, number[]>();
    const now = Date.now();
    const weekMs = 7 * 24 * 3_600_000;
    for (const row of rows) {
      const ownerKey = row.ownerId.trim() || "unassigned";
      if (!ownerMap.has(ownerKey)) ownerMap.set(ownerKey, [0, 0, 0, 0, 0, 0]);
      if (!row.completedAt) continue;
      const age = now - new Date(row.completedAt).getTime();
      if (age < 0) continue;
      const weekIdx = Math.floor(age / weekMs);
      if (weekIdx < 0 || weekIdx > 5) continue;
      const arr = ownerMap.get(ownerKey);
      if (!arr) continue;
      arr[5 - weekIdx] += 1;
    }
    return ownerMap;
  }, [rows]);

  const projectHealthById = useMemo(() => {
    const stats = new Map<string, { total: number; healthy: number }>();
    for (const row of rows) {
      if (!row.projectId) continue;
      const cur = stats.get(row.projectId) ?? { total: 0, healthy: 0 };
      cur.total += 1;
      if (row.status === "on_track" || row.status === "completed") cur.healthy += 1;
      stats.set(row.projectId, cur);
    }
    const out = new Map<string, number>();
    for (const [projectId, s] of stats.entries()) {
      out.set(projectId, Math.round((s.healthy / Math.max(1, s.total)) * 100));
    }
    return out;
  }, [rows]);

  const orderedVisibleRowIds = useMemo(() => searchFiltered.map((r) => r.id), [searchFiltered]);

  useEffect(() => {
    if (orderedVisibleRowIds.length === 0) {
      setActiveRowId(null);
      return;
    }
    if (!activeRowId || !orderedVisibleRowIds.includes(activeRowId)) {
      setActiveRowId(orderedVisibleRowIds[0] ?? null);
    }
  }, [orderedVisibleRowIds, activeRowId]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (orderedVisibleRowIds.includes(id)) next.add(id);
      }
      return next;
    });
  }, [orderedVisibleRowIds]);

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

  const dueNext72hCount = useMemo(() => {
    const now = Date.now();
    const limit = now + 72 * 3_600_000;
    return filterOnlyRows.filter((r) => {
      if (isCompletedRow(r)) return false;
      const due = new Date(r.deadline).getTime();
      return Number.isFinite(due) && due >= now && due <= limit;
    }).length;
  }, [filterOnlyRows]);

  const unassignedCount = useMemo(
    () => filterOnlyRows.filter((r) => !isCompletedRow(r) && isUnassignedOwner(r.ownerId)).length,
    [filterOnlyRows]
  );

  const staleCount = useMemo(() => {
    const now = Date.now();
    return filterOnlyRows.filter((r) => {
      if (isCompletedRow(r)) return false;
      const age = now - new Date(r.lastActivityAt).getTime();
      return Number.isFinite(age) && age >= 7 * 24 * 3_600_000;
    }).length;
  }, [filterOnlyRows]);

  const atRiskCount = useMemo(
    () => filterOnlyRows.filter((r) => !isCompletedRow(r) && r.status === "at_risk").length,
    [filterOnlyRows]
  );

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

  const markComplete = useCallback(async (id: string, e?: React.MouseEvent) => {
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
  }, [applyRowPatch, completingId, patchRemote, rows]);

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

  const saveOwner = useCallback(async (id: string, ownerId: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const snapshot = { ...row };
    applyRowPatch(id, { ownerId });
    setPopover(null);
    await patchRemote(id, { ownerId }, snapshot);
  }, [applyRowPatch, patchRemote, rows]);

  const saveDeadline = useCallback(async (id: string, iso: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const snapshot = { ...row };
    applyRowPatch(id, { deadline: new Date(iso).toISOString() });
    setPopover(null);
    await patchRemote(id, { deadline: new Date(iso).toISOString() }, snapshot);
  }, [applyRowPatch, patchRemote, rows]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const navRowIds = rows.map((r) => r.id);
      const t = e.target as HTMLElement | null;
      const isEditable =
        !!t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.closest("[role='dialog']"));
      const lower = e.key.toLowerCase();

      if (e.key === "?" && !isEditable) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
          return;
        }
        setShortcutsOpen(false);
        return;
      }
      if (isEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && popover) {
        e.preventDefault();
        if (popover.type === "owner") {
          void saveOwner(popover.commitmentId, popover.draft.trim());
        } else if (popover.type === "due" && popover.draft) {
          void saveDeadline(popover.commitmentId, `${popover.draft}T12:00:00.000Z`);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && lower === "a") {
        e.preventDefault();
        setSelectedIds(new Set(orderedVisibleRowIds));
        return;
      }

      if (lower === "f") {
        e.preventDefault();
        const idx = FEED_FILTER_OPTIONS.findIndex((x) => x.value === feedFilter);
        const next = FEED_FILTER_OPTIONS[(idx + 1) % FEED_FILTER_OPTIONS.length];
        if (next) setFeedFilter(next.value);
        return;
      }

      if (lower === "g") {
        e.preventDefault();
        window.location.assign("/feed");
        return;
      }
      if (lower === "t" && groupMode === "timeline") {
        e.preventDefault();
        setCollapsedBuckets((prev) => {
          const allCollapsed = FEED_BUCKETS.every((b) => b === "completed" || prev[b] === true);
          const next: Partial<Record<FeedBucket, boolean>> = {};
          for (const b of FEED_BUCKETS) {
            if (b === "completed") continue;
            next[b] = !allCollapsed;
          }
          return { ...prev, ...next };
        });
        return;
      }
      if (lower === "c") {
        e.preventDefault();
        openCapture();
        return;
      }
      if (lower === "l") {
        e.preventDefault();
        window.location.assign("/overview");
        return;
      }
      if (lower === "p") {
        e.preventDefault();
        window.location.assign("/projects");
        return;
      }
      if ((lower === "j" || lower === "k") && navRowIds.length > 0) {
        e.preventDefault();
        const curr = Math.max(0, navRowIds.indexOf(activeRowId ?? navRowIds[0]!));
        const nextIdx = lower === "j" ? Math.min(navRowIds.length - 1, curr + 1) : Math.max(0, curr - 1);
        const nextId = navRowIds[nextIdx] ?? null;
        setActiveRowId(nextId);
        if (nextId) {
          const el = rowButtonRefs.current.get(nextId);
          el?.focus();
          el?.scrollIntoView({ block: "nearest" });
        }
        return;
      }
      if (e.key === "Enter" && activeRowId) {
        e.preventDefault();
        setExpandedId((prev) => (prev === activeRowId ? null : activeRowId));
        return;
      }
      if (lower === "e" && activeRowId) {
        e.preventDefault();
        setExpandedId(activeRowId);
        window.setTimeout(() => {
          document.getElementById(`feed-title-input-${activeRowId}`)?.focus();
        }, 0);
        return;
      }
      if ((lower === "x" || lower === "c") && activeRowId) {
        e.preventDefault();
        void markComplete(activeRowId);
        return;
      }
      if (lower === "r" && activeRowId) {
        e.preventDefault();
        const row = rows.find((r) => r.id === activeRowId);
        setPopover({
          type: "owner",
          commitmentId: activeRowId,
          draft: row?.ownerId ?? "",
        });
        return;
      }
      if (lower === "d" && activeRowId) {
        e.preventDefault();
        const row = rows.find((r) => r.id === activeRowId);
        setPopover({
          type: "due",
          commitmentId: activeRowId,
          draft: row ? row.deadline.slice(0, 10) : "",
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeRowId,
    feedFilter,
    groupMode,
    markComplete,
    openCapture,
    orderedVisibleRowIds,
    popover,
    rows,
    saveDeadline,
    saveOwner,
    selectedIds.size,
  ]);

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

  async function completeSelected() {
    const ids = [...selectedIds];
    for (const id of ids) {
      // intentional sequential order so each optimistic completion animation remains legible.
      await markComplete(id);
    }
    setSelectedIds(new Set());
  }

  async function reassignSelected(ownerId: string) {
    const ids = [...selectedIds];
    for (const id of ids) {
      await saveOwner(id, ownerId);
    }
    setSelectedIds(new Set());
  }

  async function reprioritizeSelected(priority: OrgCommitmentRow["priority"]) {
    const ids = [...selectedIds];
    for (const id of ids) {
      await savePriority(id, priority);
    }
  }

  async function deferSelectedByDays(days: number) {
    const ids = [...selectedIds];
    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      if (!row || isCompletedRow(row)) continue;
      const base = new Date(row.deadline).getTime();
      const next = Number.isFinite(base) ? new Date(base + days * 86_400_000) : new Date();
      await saveDeadline(id, next.toISOString());
    }
  }

  function saveCurrentView(slot: number) {
    const next: FeedSavedView = {
      id: `slot-${slot}`,
      label: `View ${slot}`,
      filter: feedFilter,
      sort: feedSort,
      group: groupMode,
      search: feedSearch,
    };
    setSavedViews((prev) => {
      const rest = prev.filter((v) => v.id !== next.id);
      return [...rest, next].slice(0, 3).sort((a, b) => a.id.localeCompare(b.id));
    });
    pushToast(`Saved ${next.label}.`, "success");
  }

  function applySavedView(id: string) {
    const view = savedViews.find((v) => v.id === id);
    if (!view) return;
    setFeedFilter(view.filter);
    setFeedSort(view.sort);
    setGroupMode(view.group);
    setFeedSearch(view.search);
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

  const exportCurrent = useCallback(() => {
    downloadFeedCsv(searchFiltered, projectNameById);
    pushToast("Exported current feed view.", "success");
  }, [searchFiltered, projectNameById, pushToast]);

  const toggleSelectedRow = useCallback(
    (id: string, checked: boolean, withRange = false) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (withRange && lastSelectedId) {
          const a = orderedVisibleRowIds.indexOf(lastSelectedId);
          const b = orderedVisibleRowIds.indexOf(id);
          if (a !== -1 && b !== -1) {
            const [start, end] = a < b ? [a, b] : [b, a];
            for (let i = start; i <= end; i++) {
              const rid = orderedVisibleRowIds[i];
              if (!rid) continue;
              if (checked) next.add(rid);
              else next.delete(rid);
            }
            return next;
          }
        }
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
      setLastSelectedId(id);
    },
    [lastSelectedId, orderedVisibleRowIds]
  );

  const applyQuickPreset = useCallback(
    (preset: "my_queue" | "triage" | "critical" | "due_soon") => {
      if (preset === "my_queue") {
        setFeedFilter("mine");
        setFeedSort("due");
        setGroupMode("timeline");
        setFeedSearch("");
        return;
      }
      if (preset === "triage") {
        setFeedFilter("unassigned");
        setFeedSort("updated");
        setGroupMode("status");
        setFeedSearch("");
        return;
      }
      if (preset === "critical") {
        setFeedFilter("at_risk");
        setFeedSort("priority");
        setGroupMode("status");
        setFeedSearch("");
        return;
      }
      setFeedFilter("all");
      setFeedSort("due");
      setGroupMode("timeline");
      setFeedSearch("");
    },
    []
  );

  const filterActive = feedFilter !== "all";

  if (!bootstrapped) {
    return (
      <div className="mx-auto w-full max-w-[min(100%,1040px)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]" aria-busy="true">
        <div className="workspace-liquid-glass relative z-0 mb-8 overflow-hidden rounded-2xl border border-white/10 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] sm:mb-10 sm:p-8 [&>*]:relative [&>*]:z-10">
          <FeedPersonalGreeting />
          <FeedHeroSummary activeCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
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
      <div className="mx-auto w-full max-w-[min(100%,1040px)] px-[var(--r5-content-padding-x-mobile)] pb-[var(--r5-space-8)] pt-[var(--r5-space-5)] sm:px-[var(--r5-content-padding-x)] sm:pt-[var(--r5-space-6)]">
        <div className="workspace-liquid-glass relative z-0 mb-8 overflow-hidden rounded-2xl border border-white/10 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] sm:mb-10 sm:p-8 [&>*]:relative [&>*]:z-10">
          <FeedPersonalGreeting />
          <FeedHeroSummary activeCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
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
      <div className="mx-auto min-h-[calc(100dvh-var(--r5-layout-chrome-vertical))] w-full max-w-[min(100%,1040px)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]">
        <div className="workspace-liquid-glass relative z-0 mb-8 overflow-hidden rounded-2xl border border-white/10 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] sm:mb-10 sm:p-8 [&>*]:relative [&>*]:z-10">
          <FeedPersonalGreeting />
          <FeedHeroSummary activeCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
        </div>
        <FeedHeaderStrip
          feedSearch={feedSearch}
          setFeedSearch={setFeedSearch}
          searchInputRef={searchInputRef}
          feedFilter={feedFilter}
          setFeedFilter={setFeedFilter}
          feedSort={feedSort}
          setFeedSort={setFeedSort}
          groupMode={groupMode}
          setGroupMode={setGroupMode}
          lastSyncAt={lastSyncAt}
          lastLoadMs={lastLoadMs}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          savedViews={savedViews}
          saveCurrentView={saveCurrentView}
          applySavedView={applySavedView}
          dueNext72hCount={dueNext72hCount}
          unassignedCount={unassignedCount}
          staleCount={staleCount}
          overdueCount={overdueCount}
          atRiskCount={atRiskCount}
          openCount={activeCount}
          onExport={exportCurrent}
          density={density}
          setDensity={setDensity}
          applyQuickPreset={applyQuickPreset}
          onCaptureOpen={() => window.dispatchEvent(new Event("route5:capture-open"))}
          onSync={() => void onRefreshFeed()}
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
      <div className="mx-auto min-h-[calc(100dvh-var(--r5-layout-chrome-vertical))] w-full max-w-[min(100%,1040px)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]">
        <div className="workspace-liquid-glass relative z-0 mb-8 overflow-hidden rounded-2xl border border-white/10 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] sm:mb-10 sm:p-8 [&>*]:relative [&>*]:z-10">
          <FeedPersonalGreeting />
          <FeedHeroSummary activeCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
        </div>
        <FeedHeaderStrip
          feedSearch={feedSearch}
          setFeedSearch={setFeedSearch}
          searchInputRef={searchInputRef}
          feedFilter={feedFilter}
          setFeedFilter={setFeedFilter}
          feedSort={feedSort}
          setFeedSort={setFeedSort}
          groupMode={groupMode}
          setGroupMode={setGroupMode}
          lastSyncAt={lastSyncAt}
          lastLoadMs={lastLoadMs}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          savedViews={savedViews}
          saveCurrentView={saveCurrentView}
          applySavedView={applySavedView}
          dueNext72hCount={dueNext72hCount}
          unassignedCount={unassignedCount}
          staleCount={staleCount}
          overdueCount={overdueCount}
          atRiskCount={atRiskCount}
          openCount={activeCount}
          onExport={exportCurrent}
          density={density}
          setDensity={setDensity}
          applyQuickPreset={applyQuickPreset}
          onCaptureOpen={() => window.dispatchEvent(new Event("route5:capture-open"))}
          onSync={() => void onRefreshFeed()}
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
    <div className="route5-perspective-shell relative mx-auto min-h-[calc(100dvh-var(--r5-layout-chrome-vertical))] w-full max-w-[min(100%,1040px)] px-5 py-10 pb-16 sm:px-10 sm:py-14 sm:pb-24">
      <div className="workspace-liquid-glass relative z-0 mb-8 overflow-hidden rounded-2xl border border-white/10 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] sm:mb-10 sm:p-8 [&>*]:relative [&>*]:z-10">
        <FeedPersonalGreeting />
        <FeedHeroSummary activeCount={activeCount} overdueCount={overdueCount} completedThisWeek={completedThisWeek} />
      </div>
      <FeedHeaderStrip
        feedSearch={feedSearch}
        setFeedSearch={setFeedSearch}
        searchInputRef={searchInputRef}
        feedFilter={feedFilter}
        setFeedFilter={setFeedFilter}
        feedSort={feedSort}
        setFeedSort={setFeedSort}
        groupMode={groupMode}
        setGroupMode={setGroupMode}
        lastSyncAt={lastSyncAt}
        lastLoadMs={lastLoadMs}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        savedViews={savedViews}
        saveCurrentView={saveCurrentView}
        applySavedView={applySavedView}
        dueNext72hCount={dueNext72hCount}
        unassignedCount={unassignedCount}
        staleCount={staleCount}
        overdueCount={overdueCount}
        atRiskCount={atRiskCount}
        openCount={activeCount}
        onExport={exportCurrent}
        density={density}
        setDensity={setDensity}
        applyQuickPreset={applyQuickPreset}
        onCaptureOpen={() => window.dispatchEvent(new Event("route5:capture-open"))}
        onSync={() => void onRefreshFeed()}
        refreshing={refreshing}
      />

      {focusLane.length > 0 ? (
        <section className="workspace-preview-panel mb-4 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-r5-text-secondary">Focus lane</p>
            <span className="text-[11px] text-r5-text-tertiary">Top execution pressure</span>
          </div>
          <ul className="space-y-1.5">
            {focusLane.map(({ row, score }) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(row.id)}
                  className="flex w-full items-center justify-between rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/60 px-3 py-2 text-left transition hover:bg-r5-surface-hover"
                >
                  <span className="truncate text-[13px] text-r5-text-primary">{row.title}</span>
                  <span className="ml-2 shrink-0 text-[11px] text-r5-text-secondary">Score {score}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {selectedIds.size > 0 ? (
        <div className="workspace-preview-panel mb-4 px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-r5-text-secondary">
            {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-[var(--r5-radius-pill)] px-2 py-1 text-[12px] text-r5-text-secondary hover:text-r5-text-primary"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void completeSelected()}
              className="rounded-[var(--r5-radius-pill)] border border-r5-status-completed/30 bg-r5-status-completed/15 px-3 py-1 text-[12px] font-medium text-r5-text-primary"
            >
              Complete all
            </button>
          {selfId ? (
            <button
              type="button"
              onClick={() => void reassignSelected(selfId)}
              className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-3 py-1 text-[12px] font-medium text-r5-text-primary"
            >
              Assign to me
            </button>
          ) : null}
            <details className="group">
              <summary className="cursor-pointer list-none rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-3 py-1 text-[12px] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover">
                Advanced actions
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ownerId = window.prompt("Reassign selected commitments to owner id:");
                    if (ownerId?.trim()) void reassignSelected(ownerId.trim());
                  }}
                  className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-3 py-1 text-[12px] font-medium text-r5-text-primary"
                >
                  Reassign all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const choice = window.prompt("Priority for selected: critical | high | medium | low", "medium");
                    const normalized = choice?.trim().toLowerCase();
                    if (
                      normalized === "critical" ||
                      normalized === "high" ||
                      normalized === "medium" ||
                      normalized === "low"
                    ) {
                      void reprioritizeSelected(normalized);
                    }
                  }}
                  className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-3 py-1 text-[12px] font-medium text-r5-text-primary"
                >
                  Priority all
                </button>
                <button
                  type="button"
                  onClick={() => void deferSelectedByDays(2)}
                  className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-3 py-1 text-[12px] font-medium text-r5-text-primary"
                >
                  Push due +2d
                </button>
              </div>
            </details>
          </div>
        </div>
      ) : null}

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

      {groupMode === "owner" ? (
        <div className="space-y-8">
          {groupedByOwner.map(([ownerId, list]) => (
            <FeedSectionStatic
              key={ownerId}
              bucket={ownerId === "unassigned" ? "later" : "week"}
              label={
                ownerId === "unassigned"
                  ? `Unassigned (${list.length})`
                  : `${ownerHoverLabelFromId(ownerId, selfId, selfDisplayName)} (${list.length})`
              }
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
              activeRowId={activeRowId}
              setActiveRowId={setActiveRowId}
              rowButtonRefs={rowButtonRefs}
              selectedIds={selectedIds}
              toggleSelected={toggleSelectedRow}
              ownerTrendByOwnerId={ownerTrendByOwnerId}
              projectHealthById={projectHealthById}
              nowMs={nowMs}
              prefetchDetail={prefetchDetail}
              density={density}
            />
          ))}
        </div>
      ) : groupMode === "status" ? (
        <div className="workspace-preview-panel grid gap-3 p-3 lg:grid-cols-5">
          {groupedByStatus.map((lane) => (
            <section key={lane.key} className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/60 bg-r5-surface-primary/35">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-r5-border-subtle/50 bg-r5-surface-secondary/70 px-3 py-2 backdrop-blur-sm">
                <h3 className="text-[12px] font-semibold text-r5-text-primary">{lane.label}</h3>
                <span className="text-[11px] text-r5-text-tertiary">{lane.rows.length}</span>
              </div>
              <ul className="max-h-[58vh] space-y-2 overflow-y-auto p-2">
                {lane.rows.length === 0 ? (
                  <li className="rounded-[var(--r5-radius-md)] border border-dashed border-r5-border-subtle/60 px-2 py-3 text-center text-[11px] text-r5-text-tertiary">
                    No items
                  </li>
                ) : (
                  lane.rows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                        className="w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/70 px-2.5 py-2 text-left transition hover:bg-r5-surface-hover"
                      >
                        <p className="line-clamp-2 text-[12px] font-medium text-r5-text-primary">{row.title}</p>
                        <p className="mt-1 text-[10px] text-r5-text-secondary">
                          {ownerHoverLabelFromId(row.ownerId, selfId, selfDisplayName)} · {formatFeedDueLabel(row.deadline)}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      ) : (
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
                  activeRowId={activeRowId}
                  setActiveRowId={setActiveRowId}
                  rowButtonRefs={rowButtonRefs}
                  selectedIds={selectedIds}
                  toggleSelected={toggleSelectedRow}
                  ownerTrendByOwnerId={ownerTrendByOwnerId}
                  projectHealthById={projectHealthById}
                  nowMs={nowMs}
                  prefetchDetail={prefetchDetail}
                  density={density}
                />
              );
            }

            const collapsed = collapsedBuckets[bucket] === true;
            return (
              <section key={bucket}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedBuckets((prev) => ({ ...prev, [bucket]: !collapsed }))
                  }
                  className="mb-3 flex w-full items-center justify-between px-0.5 text-left"
                >
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-r5-text-primary">
                    {collapsed ? (
                      <ChevronRight className="h-4 w-4 text-r5-text-secondary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-r5-text-secondary" />
                    )}
                    {SECTION_LABEL[bucket]}
                  </span>
                  <span className={`text-[13px] font-medium tabular-nums ${sectionCountClass(bucket)}`}>
                    {list.length}
                  </span>
                </button>
                {!collapsed ? (
                  <FeedSectionStatic
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
                    activeRowId={activeRowId}
                    setActiveRowId={setActiveRowId}
                    rowButtonRefs={rowButtonRefs}
                    selectedIds={selectedIds}
                    toggleSelected={toggleSelectedRow}
                    ownerTrendByOwnerId={ownerTrendByOwnerId}
                    projectHealthById={projectHealthById}
                    nowMs={nowMs}
                    prefetchDetail={prefetchDetail}
                    density={density}
                  />
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {shortcutsOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-primary p-4 shadow-[var(--r5-shadow-elevated)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-r5-text-secondary">Keyboard shortcuts</p>
              <button type="button" onClick={() => setShortcutsOpen(false)} className="rounded p-1 text-r5-text-secondary hover:bg-r5-surface-hover">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1 text-[13px] text-r5-text-primary">
              <li><kbd className="font-mono">F</kbd> Next filter · <kbd className="font-mono">G</kbd> Feed · <kbd className="font-mono">C</kbd> Capture · <kbd className="font-mono">L</kbd> Leadership · <kbd className="font-mono">P</kbd> Projects</li>
              <li><kbd className="font-mono">J / K</kbd> Move row · <kbd className="font-mono">Enter</kbd> Expand</li>
              <li><kbd className="font-mono">E</kbd> Edit · <kbd className="font-mono">X</kbd> Complete · <kbd className="font-mono">R</kbd> Reassign · <kbd className="font-mono">D</kbd> Deadline</li>
              <li><kbd className="font-mono">/</kbd> Search · <kbd className="font-mono">T</kbd> Collapse groups · <kbd className="font-mono">⌘A</kbd> Select all · <kbd className="font-mono">?</kbd> This panel · <kbd className="font-mono">Esc</kbd> Close</li>
            </ul>
          </div>
        </div>
      ) : null}
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
  groupMode,
  setGroupMode,
  lastSyncAt,
  lastLoadMs,
  autoRefresh,
  setAutoRefresh,
  savedViews,
  saveCurrentView,
  applySavedView,
  dueNext72hCount,
  unassignedCount,
  staleCount,
  overdueCount,
  atRiskCount,
  openCount,
  onExport,
  density,
  setDensity,
  applyQuickPreset,
  onCaptureOpen,
  onSync,
  refreshing,
}: {
  feedSearch: string;
  setFeedSearch: (s: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  feedFilter: FeedFilter;
  setFeedFilter: (f: FeedFilter) => void;
  feedSort: FeedSortUi;
  setFeedSort: (s: FeedSortUi) => void;
  groupMode: FeedGroupMode;
  setGroupMode: (mode: FeedGroupMode) => void;
  lastSyncAt: string | null;
  lastLoadMs: number | null;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  savedViews: FeedSavedView[];
  saveCurrentView: (slot: number) => void;
  applySavedView: (id: string) => void;
  dueNext72hCount: number;
  unassignedCount: number;
  staleCount: number;
  overdueCount: number;
  atRiskCount: number;
  openCount: number;
  onExport: () => void;
  density: FeedDensity;
  setDensity: (d: FeedDensity) => void;
  applyQuickPreset: (preset: "my_queue" | "triage" | "critical" | "due_soon") => void;
  onCaptureOpen: () => void;
  onSync: () => void;
  refreshing: boolean;
}) {
  const quietLink =
    "text-[13px] font-normal text-r5-text-secondary transition-colors hover:text-r5-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r5-accent/40";
  const presetBtn = `${quietLink} rounded-sm px-0.5`;

  const stats = [
    { key: "open", label: "Open", value: openCount },
    { key: "overdue", label: "Overdue", value: overdueCount, stress: overdueCount > 0 },
    { key: "risk", label: "At risk", value: atRiskCount, stress: atRiskCount > 0 },
    { key: "due72", label: "Due 72h", value: dueNext72hCount },
    { key: "unassigned", label: "Unassigned", value: unassignedCount },
    { key: "stale", label: "Stale", value: staleCount },
  ] as const;

  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 w-full space-y-4 sm:mb-10"
    >
      <div className="workspace-preview-panel flex flex-col gap-6 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-r5-text-primary sm:text-2xl">Feed</h1>
          <p className="text-[13px] font-medium text-r5-text-secondary">
            Updated {relativeTimeLabel(lastSyncAt)}
            {lastLoadMs != null ? ` · ${lastLoadMs}ms` : ""}
          </p>
        </div>
        <div className="w-full min-w-0 flex-1 lg:max-w-md xl:max-w-lg">
          <label className="sr-only" htmlFor="feed-search-input">
            Search commitments
          </label>
          <div className="relative flex w-full items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-r5-text-tertiary"
              strokeWidth={1.75}
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
              className="min-h-[44px] w-full rounded-xl border border-r5-border-subtle bg-r5-surface-primary/70 py-2.5 pl-11 pr-3.5 text-[15px] font-normal text-r5-text-primary shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] outline-none transition-[border-color,box-shadow,transform] placeholder:text-r5-text-tertiary focus:border-r5-accent/45 focus:shadow-[0_0_0_1px_rgba(167,139,250,0.2),0_8px_28px_-12px_rgba(99,102,241,0.25)]"
            />
          </div>
          <p className="mt-2 text-[12px] text-r5-text-tertiary">
            Press{" "}
            <kbd className="rounded border border-r5-border-subtle bg-r5-surface-primary px-1 py-0.5 font-mono text-[11px] text-r5-text-secondary">
              /
            </kbd>{" "}
            to focus search
          </p>
        </div>
      </div>

      <dl className="workspace-preview-panel grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.key}
            className="flex flex-col gap-0.5 bg-r5-surface-primary/35 px-4 py-3.5 sm:min-h-[88px] sm:justify-center"
          >
            <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-r5-text-tertiary">{s.label}</dt>
            <dd
              className={`text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${
                "stress" in s && s.stress ? "text-r5-text-primary" : "text-r5-text-primary"
              }`}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <nav className="workspace-preview-panel px-4 pb-3 pt-3.5 sm:px-5" aria-label="Assignment filters">
        <div className="-mb-px flex flex-wrap gap-x-5 gap-y-1">
          {FEED_FILTER_OPTIONS.map((opt) => {
            const active = opt.value === feedFilter;
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.hint}
                onClick={() => setFeedFilter(opt.value)}
                className={`relative pb-3 text-[13px] font-medium transition-colors ${
                  active
                    ? "text-r5-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-r5-accent after:content-['']"
                    : "text-r5-text-secondary hover:text-r5-text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="workspace-preview-panel flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px]">
          <button type="button" onClick={() => applyQuickPreset("my_queue")} className={presetBtn}>
            My queue
          </button>
          <span className="text-r5-text-tertiary" aria-hidden>
            ·
          </span>
          <button type="button" onClick={() => applyQuickPreset("triage")} className={presetBtn}>
            Triage
          </button>
          <span className="text-r5-text-tertiary" aria-hidden>
            ·
          </span>
          <button type="button" onClick={() => applyQuickPreset("critical")} className={presetBtn}>
            At risk
          </button>
          <span className="text-r5-text-tertiary" aria-hidden>
            ·
          </span>
          <button type="button" onClick={() => applyQuickPreset("due_soon")} className={presetBtn}>
            Due soon
          </button>
          <span className="mx-2 hidden h-4 w-px bg-r5-border-subtle sm:block" aria-hidden />
          <button
            type="button"
            onClick={onCaptureOpen}
            className="rounded-full bg-r5-accent/20 px-3 py-1.5 text-[13px] font-semibold text-r5-text-primary ring-1 ring-r5-accent/35 transition hover:bg-r5-accent/28"
          >
            Capture
          </button>
          <span className="mx-2 hidden h-4 w-px bg-r5-border-subtle sm:block" aria-hidden />
          <Link href="/desk" className={quietLink}>
            Desk
          </Link>
          <span className="text-r5-text-tertiary" aria-hidden>
            ·
          </span>
          <Link href="/overview" className={quietLink}>
            Leadership
          </Link>
          <span className="text-r5-text-tertiary" aria-hidden>
            ·
          </span>
          <Link href="/workspace/escalations" className={quietLink}>
            Escalations
          </Link>
          <span className="text-r5-text-tertiary" aria-hidden>
            ·
          </span>
          <Link href="/projects" className={quietLink}>
            Projects
          </Link>
          <span className="text-r5-text-tertiary" aria-hidden>
            ·
          </span>
          <Link href="/integrations" className={quietLink}>
            Integrations
          </Link>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={refreshing}
          title="Reload list"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-r5-border-subtle bg-r5-surface-primary/70 px-4 py-2 text-[13px] font-medium text-r5-text-primary transition hover:border-r5-accent/35 hover:bg-r5-surface-hover disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          Sync
        </button>
      </div>

      <details className="workspace-preview-panel group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[13px] font-medium text-r5-text-secondary marker:content-none [&::-webkit-details-marker]:hidden sm:px-5">
          <span>Display and export</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-r5-text-tertiary transition duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-r5-border-subtle/60 px-5 pb-6 pt-5 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <label className="flex max-w-md cursor-pointer items-start gap-3 text-[14px] leading-snug text-r5-text-secondary">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-r5-border-subtle bg-transparent text-r5-accent focus:ring-r5-accent/35"
              />
              <span>
                Background sync refreshes the list every 30 seconds while this page is open.
              </span>
            </label>
            <button
              type="button"
              onClick={onExport}
              className="shrink-0 rounded-full border border-r5-border-subtle bg-r5-surface-primary/70 px-4 py-2 text-[14px] font-medium text-r5-text-primary transition hover:border-r5-accent/35 hover:text-r5-text-primary"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {[1, 2, 3].map((slot) => {
              const id = `slot-${slot}`;
              const has = savedViews.some((v) => v.id === id);
              return (
                <div
                  key={id}
                  className="inline-flex overflow-hidden rounded-full border border-r5-border-subtle"
                >
                  <button
                    type="button"
                    onClick={() => saveCurrentView(slot)}
                    className="px-3 py-1.5 text-[12px] font-medium text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
                    title={`Save view ${slot}`}
                  >
                    Save {slot}
                  </button>
                  <button
                    type="button"
                    onClick={() => applySavedView(id)}
                    disabled={!has}
                    className="border-l border-r5-border-subtle px-3 py-1.5 text-[12px] font-medium text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary disabled:opacity-35"
                    title={`Load view ${slot}`}
                  >
                    Load {slot}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-r5-text-tertiary">Group by</p>
              <div className="inline-flex overflow-hidden rounded-full border border-r5-border-subtle p-0.5">
                {(["timeline", "owner", "status"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGroupMode(mode)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                      groupMode === mode
                        ? "bg-r5-accent text-white"
                        : "text-r5-text-secondary hover:text-r5-text-primary"
                    }`}
                  >
                    {mode === "timeline" ? "Timeline" : mode === "owner" ? "Owner" : "State"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-r5-text-tertiary">Density</p>
              <div className="inline-flex overflow-hidden rounded-full border border-r5-border-subtle p-0.5">
                {(["comfortable", "compact"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDensity(mode)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                      density === mode
                        ? "bg-r5-accent text-white"
                        : "text-r5-text-secondary hover:text-r5-text-primary"
                    }`}
                  >
                    {mode === "comfortable" ? "Roomy" : "Dense"}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-[200px] flex-1 lg:max-w-xs">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-r5-text-tertiary">Sort</p>
              <select
                value={feedSort}
                onChange={(e) => setFeedSort(e.target.value as FeedSortUi)}
                className="h-11 w-full cursor-pointer rounded-xl border border-r5-border-subtle bg-r5-surface-primary/70 px-3 text-[14px] font-medium text-r5-text-primary outline-none transition focus:border-r5-accent/35 focus:ring-1 focus:ring-r5-accent/20"
                aria-label="Sort"
              >
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="owner">Owner</option>
                <option value="updated">Recently updated</option>
                <option value="risk">Slip risk</option>
              </select>
            </div>
          </div>
        </div>
      </details>
    </motion.header>
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
  activeRowId,
  setActiveRowId,
  rowButtonRefs,
  selectedIds,
  toggleSelected,
  ownerTrendByOwnerId,
  projectHealthById,
  nowMs,
  prefetchDetail,
  density,
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
  activeRowId: string | null;
  setActiveRowId: (id: string | null) => void;
  rowButtonRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  selectedIds: Set<string>;
  toggleSelected: (id: string, checked: boolean, withRange?: boolean) => void;
  ownerTrendByOwnerId: Map<string, number[]>;
  projectHealthById: Map<string, number>;
  nowMs: number;
  prefetchDetail: (id: string) => void;
  density: FeedDensity;
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
        className={`workspace-preview-panel route5-tilt-hover overflow-visible bg-r5-surface-primary/22 ${bucketListAccent(bucket)}`}
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
              active={activeRowId === row.id}
              onActivate={() => setActiveRowId(row.id)}
              rowButtonRefs={rowButtonRefs}
              selected={selectedIds.has(row.id)}
              toggleSelected={toggleSelected}
              ownerTrendByOwnerId={ownerTrendByOwnerId}
              projectHealthById={projectHealthById}
              nowMs={nowMs}
              prefetchDetail={prefetchDetail}
              density={density}
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
  activeRowId,
  setActiveRowId,
  rowButtonRefs,
  selectedIds,
  toggleSelected,
  ownerTrendByOwnerId,
  projectHealthById,
  nowMs,
  prefetchDetail,
  density,
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
  activeRowId: string | null;
  setActiveRowId: (id: string | null) => void;
  rowButtonRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  selectedIds: Set<string>;
  toggleSelected: (id: string, checked: boolean, withRange?: boolean) => void;
  ownerTrendByOwnerId: Map<string, number[]>;
  projectHealthById: Map<string, number>;
  nowMs: number;
  prefetchDetail: (id: string) => void;
  density: FeedDensity;
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
            className={`workspace-preview-panel route5-tilt-hover overflow-hidden bg-r5-surface-primary/22 ${bucketListAccent(bucket)}`}
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
                active={activeRowId === row.id}
                onActivate={() => setActiveRowId(row.id)}
                rowButtonRefs={rowButtonRefs}
                selected={selectedIds.has(row.id)}
                toggleSelected={toggleSelected}
                ownerTrendByOwnerId={ownerTrendByOwnerId}
                projectHealthById={projectHealthById}
                nowMs={nowMs}
                prefetchDetail={prefetchDetail}
                density={density}
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
  active,
  onActivate,
  rowButtonRefs,
  selected,
  toggleSelected,
  ownerTrendByOwnerId,
  projectHealthById,
  nowMs,
  prefetchDetail,
  density,
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
  active: boolean;
  onActivate: () => void;
  rowButtonRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  selected: boolean;
  toggleSelected: (id: string, checked: boolean, withRange?: boolean) => void;
  ownerTrendByOwnerId: Map<string, number[]>;
  projectHealthById: Map<string, number>;
  nowMs: number;
  prefetchDetail: (id: string) => void;
  density: FeedDensity;
}) {
  const { displayName: memberName } = useMemberDirectory();
  const completed = isCompletedRow(row);
  const completing = completingId === row.id;
  const unassigned = isUnassignedOwner(row.ownerId);
  const [titleDraft, setTitleDraft] = useState(row.title);
  const [descDraft, setDescDraft] = useState(row.description ?? "");
  const [commentDraft, setCommentDraft] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePeek, setProfilePeek] = useState<{ userId: string; rect: DOMRect } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const ownerBtnRef = useRef<HTMLDivElement>(null);
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
  const sourceLabel = sourceLabelFromDescription(row.description);
  const risk = isLikelyAtRisk(row);
  const staleDays = Math.floor((nowMs - new Date(row.lastActivityAt).getTime()) / (24 * 3_600_000));
  const trend = ownerTrendByOwnerId.get(row.ownerId.trim() || "unassigned") ?? [0, 0, 0, 0, 0, 0];
  const trendMax = Math.max(1, ...trend);
  const projectHealth = row.projectId ? projectHealthById.get(row.projectId) : null;

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
      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      transition={{ duration: justAdded ? 0.45 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`group border-b border-r5-border-subtle/40 last:border-b-0 ${
        overdueBorder ? "border-l-2 border-l-r5-status-overdue" : ""
      } ${dimLater ? "opacity-[0.72]" : ""} ${completed ? "opacity-60" : ""} ${
        justAdded ? "ring-1 ring-r5-status-on-track/35 ring-inset" : ""
      } ${active ? "bg-white/[0.03] ring-1 ring-r5-accent/35 ring-inset" : ""}`}
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
        ref={(el) => {
          if (el) rowButtonRefs.current.set(row.id, el);
          else rowButtonRefs.current.delete(row.id);
        }}
        className={`w-full cursor-pointer text-left outline-none transition-colors duration-[var(--r5-duration-fast)] hover:bg-r5-surface-hover/55 focus-visible:ring-2 focus-visible:ring-r5-accent/35 ${
          density === "compact" ? "px-2.5 py-1.5 sm:px-3.5 sm:py-2" : "px-3.5 py-2 sm:px-4 sm:py-2.5"
        }`}
        onFocus={onActivate}
        onMouseEnter={() => {
          onActivate();
          prefetchDetail(row.id);
        }}
      >
        <div className="flex min-h-[36px] items-start gap-2 sm:gap-3">
          <div className="flex shrink-0 items-start gap-2 pt-0.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelected(row.id, e.target.checked, e.nativeEvent instanceof MouseEvent ? e.nativeEvent.shiftKey : false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 h-3.5 w-3.5 rounded border-r5-border-subtle bg-r5-surface-primary opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Select ${row.title}`}
            />
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
                    setProfilePeek(null);
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
              <div
                ref={ownerBtnRef}
                className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--r5-radius-pill)] py-0.5"
              >
                {unassigned ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopover({ type: "owner", commitmentId: row.id, draft: row.ownerId });
                    }}
                    title="Assign owner"
                    aria-expanded={ownerPopoverOpen}
                    className="inline-flex max-w-full items-center gap-1.5 text-left transition hover:text-r5-text-primary"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r5-radius-pill)] border border-dashed border-r5-border-subtle bg-r5-surface-secondary/50">
                      <Plus className="h-3 w-3 text-r5-text-secondary" />
                    </span>
                    <span className="text-r5-status-at-risk">Unassigned</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfilePeek({ userId: row.ownerId, rect: e.currentTarget.getBoundingClientRect() });
                      }}
                      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-r5-accent/40"
                      title={`${memberName(row.ownerId, selfId, selfDisplayName)} — profile`}
                      aria-label={`Open profile for ${memberName(row.ownerId, selfId, selfDisplayName)}`}
                    >
                      <MemberAvatar
                        userId={row.ownerId}
                        size={24}
                        selfDisplayName={selfDisplayName}
                        selfInitials={selfInitials}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfilePeek({ userId: row.ownerId, rect: e.currentTarget.getBoundingClientRect() });
                      }}
                      className="min-w-0 truncate text-left transition hover:text-r5-text-primary sm:max-w-[220px]"
                    >
                      {memberName(row.ownerId, selfId, selfDisplayName)}
                    </button>
                  </>
                )}
              </div>
              {!completed ? (
                <svg
                  width="26"
                  height="8"
                  viewBox="0 0 26 8"
                  className="opacity-70"
                  aria-label="Owner completion trend"
                >
                  {trend.map((v, i) => {
                    const h = Math.max(1, Math.round((v / trendMax) * 7));
                    return (
                      <rect
                        key={i}
                        x={i * 4 + 1}
                        y={8 - h}
                        width="3"
                        height={h}
                        rx="1"
                        className="fill-r5-text-tertiary"
                      />
                    );
                  })}
                </svg>
              ) : null}

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
                <>
                  <Link
                    href={`/projects/${row.projectId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle/60 bg-r5-surface-secondary/30 px-2.5 py-0.5 text-[length:var(--r5-font-caption)] font-medium text-r5-text-secondary transition hover:border-r5-border-subtle hover:text-r5-text-primary"
                  >
                    {projectNameById.get(row.projectId) ?? "Project"}
                  </Link>
                  {typeof projectHealth === "number" ? (
                    <span className="text-[11px] text-r5-text-tertiary">Health {projectHealth}%</span>
                  ) : null}
                </>
              ) : null}
              {sourceLabel ? (
                <span className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle/60 bg-r5-surface-secondary/30 px-2 py-0.5 text-[11px] text-r5-text-secondary">
                  Source: {sourceLabel}
                </span>
              ) : null}
              {risk.risky ? (
                <span className="rounded-[var(--r5-radius-pill)] border border-r5-status-at-risk/35 bg-r5-status-at-risk/15 px-2 py-0.5 text-[11px] text-r5-status-at-risk" title={risk.reason ?? "Execution risk"}>
                  Risk
                </span>
              ) : null}
              {!completed && staleDays >= 7 ? (
                <span
                  className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle/70 bg-r5-surface-secondary/45 px-2 py-0.5 text-[11px] text-r5-text-secondary"
                  title="No recent activity on this commitment"
                >
                  Quiet {staleDays}d
                </span>
              ) : null}
              {!completed ? (
                <Link
                  href={`/workspace/escalations?commitment_id=${encodeURIComponent(row.id)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle/60 px-2 py-0.5 text-[11px] text-r5-text-secondary hover:text-r5-text-primary"
                >
                  Escalate
                </Link>
              ) : null}
              <span className="text-[11px] text-r5-text-tertiary">Updated {relativeTimeLabel(row.updatedAt)}</span>
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
                  id={`feed-title-input-${row.id}`}
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
                        <MemberAvatar
                          userId={c.userId}
                          size={28}
                          selfDisplayName={selfDisplayName}
                          selfInitials={selfInitials}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[length:var(--r5-font-caption)] font-medium text-r5-text-primary">
                            {memberName(c.userId, selfId, selfDisplayName)}
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

    {typeof document !== "undefined" && profilePeek
      ? createPortal(
          <MemberProfilePeek
            userId={profilePeek.userId}
            anchorRect={profilePeek.rect}
            onClose={() => setProfilePeek(null)}
            selfDisplayName={selfDisplayName}
            selfInitials={selfInitials}
          />,
          document.body
        )
      : null}

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

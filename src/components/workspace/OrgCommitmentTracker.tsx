"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import type {
  OrgCommitmentDetail,
  OrgCommitmentListSort,
  OrgCommitmentRow,
} from "@/lib/org-commitment-types";
import {
  ORG_PRIORITY_LABEL,
  ORG_PRIORITY_PILL,
  ORG_STATUS_LABEL,
  ORG_STATUS_PILL,
} from "@/lib/org-commitments/tracker-constants";
import { NativeDatetimeLocalInput } from "@/components/ui/native-datetime-fields";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";
import type { UpgradePromptPayload } from "@/lib/billing/types";

const STATUSES = [
  "not_started",
  "in_progress",
  "on_track",
  "at_risk",
  "overdue",
  "completed",
] as const;

const PRIORITIES = ["critical", "high", "medium", "low"] as const;

function ownerLabel(ownerId: string, selfId: string | undefined) {
  if (selfId && ownerId === selfId) return "You";
  return ownerId.length > 12 ? `${ownerId.slice(0, 10)}…` : ownerId;
}

export default function OrgCommitmentTracker() {
  const { t } = useI18n();
  const { user } = useUser();
  const { showUpgrade } = useBillingUpgrade();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<OrgCommitmentRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [detail, setDetail] = useState<OrgCommitmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<OrgCommitmentListSort>("deadline");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cOwner, setCOwner] = useState("");
  const [cDeadline, setCDeadline] = useState("");
  const [cPriority, setCPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [saving, setSaving] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState<(typeof PRIORITIES)[number]>("medium");

  const [comment, setComment] = useState("");
  const [depPick, setDepPick] = useState("");

  const [detailTab, setDetailTab] = useState<"main" | "escalations">("main");
  const [commitmentEscalations, setCommitmentEscalations] = useState<
    {
      id: string;
      severity: string;
      triggeredAt: string;
      resolvedAt: string | null;
      snoozedUntil: string | null;
      snoozeReason: string | null;
      resolutionNotes: string | null;
    }[]
  >([]);
  const [loadingEscalationTab, setLoadingEscalationTab] = useState(false);

  useEffect(() => {
    if (user?.id) setCOwner(user.id);
  }, [user?.id]);

  useEffect(() => {
    const s = searchParams.get("status");
    if (s && (STATUSES as readonly string[]).includes(s)) {
      setStatusFilter(s);
    }
  }, [searchParams]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (statusFilter) p.set("status", statusFilter);
    if (priorityFilter) p.set("priority", priorityFilter);
    if (ownerFilter.trim()) p.set("owner", ownerFilter.trim());
    if (dateFrom) p.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) p.set("dateTo", new Date(dateTo).toISOString());
    p.set("sort", sort);
    p.set("order", order);
    return p.toString();
  }, [q, statusFilter, priorityFilter, ownerFilter, dateFrom, dateTo, sort, order]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/commitments?${queryString}`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        orgId?: string;
        commitments?: OrgCommitmentRow[];
        error?: string;
      };
      if (!res.ok) {
        setRows([]);
        return;
      }
      if (data.orgId) setOrgId(data.orgId);
      setRows(data.commitments ?? []);
    } finally {
      setLoadingList(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/commitments/${id}`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        commitment?: OrgCommitmentDetail;
      };
      if (!res.ok) {
        setDetail(null);
        return;
      }
      const c = data.commitment;
      setDetail(c ?? null);
      if (c) {
        setEditTitle(c.title);
        setEditDesc(c.description ?? "");
        setEditOwner(c.ownerId);
        setEditDeadline(c.deadline.slice(0, 16));
        setEditPriority(c.priority);
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    setDetailTab("main");
  }, [selectedId]);

  const loadCommitmentEscalations = useCallback(async (commitmentId: string) => {
    setLoadingEscalationTab(true);
    try {
      const res = await fetch(
        `/api/escalations?resolved=all&commitment_id=${encodeURIComponent(commitmentId)}&limit=200`,
        { credentials: "same-origin" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        escalations?: {
          id: string;
          severity: string;
          triggeredAt: string;
          resolvedAt: string | null;
          snoozedUntil: string | null;
          snoozeReason: string | null;
          resolutionNotes: string | null;
        }[];
      };
      if (res.ok) setCommitmentEscalations(data.escalations ?? []);
    } finally {
      setLoadingEscalationTab(false);
    }
  }, []);

  useEffect(() => {
    if (detailTab === "escalations" && selectedId) void loadCommitmentEscalations(selectedId);
  }, [detailTab, selectedId, loadCommitmentEscalations]);

  useEffect(() => {
    if (!orgId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`org-commitments:${orgId}`);
    channel.on("broadcast", { event: "change" }, () => {
      void loadList();
      if (selectedId) void loadDetail(selectedId);
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [orgId, loadList, loadDetail, selectedId]);

  function openDetail(id: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("id", id);
    router.push(`/workspace/commitments?${p.toString()}`, { scroll: false });
  }

  function closeDetail() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("id");
    router.push(`/workspace/commitments?${p.toString()}`, { scroll: false });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cTitle.trim() || !cOwner.trim() || !cDeadline) return;
    setSaving(true);
    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cTitle.trim(),
          description: cDesc.trim() || null,
          ownerId: cOwner.trim(),
          deadline: new Date(cDeadline).toISOString(),
          priority: cPriority,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        commitment?: OrgCommitmentRow;
        error?: string;
        upgrade?: UpgradePromptPayload;
      };
      if (res.status === 409 && data.upgrade) {
        showUpgrade(data.upgrade);
        return;
      }
      if (!res.ok || !data.commitment) return;
      setCreateOpen(false);
      setCTitle("");
      setCDesc("");
      setCDeadline("");
      await loadList();
      openDetail(data.commitment.id);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!selectedId || !detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/commitments/${selectedId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          ownerId: editOwner.trim(),
          deadline: new Date(editDeadline).toISOString(),
          priority: editPriority,
        }),
      });
      if (!res.ok) return;
      await loadDetail(selectedId);
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function markComplete(done: boolean) {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/commitments/${selectedId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: done }),
      });
      if (!res.ok) return;
      await loadDetail(selectedId);
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function removeCommitment() {
    if (!selectedId) return;
    if (!confirm("Archive this commitment?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/commitments/${selectedId}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) return;
      closeDetail();
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !comment.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/commitments/${selectedId}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });
      if (!res.ok) return;
      setComment("");
      await loadDetail(selectedId);
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(f: File) {
    if (!selectedId) return;
    const fd = new FormData();
    fd.set("file", f);
    setSaving(true);
    try {
      const res = await fetch(`/api/commitments/${selectedId}/attachments`, {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      if (!res.ok) return;
      await loadDetail(selectedId);
    } finally {
      setSaving(false);
    }
  }

  async function addDep() {
    if (!selectedId || !depPick) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/commitments/${selectedId}/dependencies`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependsOnCommitmentId: depPick }),
      });
      if (!res.ok) return;
      setDepPick("");
      await loadDetail(selectedId);
    } finally {
      setSaving(false);
    }
  }

  const trackerStats = useMemo(() => {
    const open = rows.filter((r) => r.status !== "completed");
    const now = Date.now();
    const soonMs = 72 * 3_600_000;
    return {
      total: rows.length,
      open: open.length,
      overdue: rows.filter((r) => r.status === "overdue").length,
      atRisk: rows.filter((r) => r.status === "at_risk").length,
      dueSoon: open.filter((r) => {
        const due = new Date(r.deadline).getTime();
        return Number.isFinite(due) && due >= now && due - now <= soonMs;
      }).length,
    };
  }, [rows]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (q.trim()) n += 1;
    if (statusFilter) n += 1;
    if (priorityFilter) n += 1;
    if (ownerFilter.trim()) n += 1;
    if (dateFrom) n += 1;
    if (dateTo) n += 1;
    if (sort !== "deadline") n += 1;
    if (order !== "asc") n += 1;
    if (attentionOnly) n += 1;
    return n;
  }, [attentionOnly, dateFrom, dateTo, order, ownerFilter, priorityFilter, q, sort, statusFilter]);

  async function markCompleteFromList(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/commitments/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) return;
      await loadList();
      if (selectedId === id) await loadDetail(id);
    } finally {
      setSaving(false);
    }
  }

  const rowsForList = useMemo(() => {
    if (statusFilter) return rows;
    return rows.filter((r) => r.status !== "completed");
  }, [rows, statusFilter]);

  const sortedForDisplay = useMemo(
    () =>
      attentionOnly
        ? rowsForList.filter((r) => r.status === "overdue" || r.status === "at_risk")
        : rowsForList,
    [rowsForList, attentionOnly]
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1680px] flex-col gap-5 pb-20">
      <section className="rounded-[22px] border border-zinc-200/90 bg-[#fafafa] p-[1px] shadow-[0_10px_40px_-24px_rgba(0,0,0,0.25)]">
        <div className="relative flex flex-col gap-4 rounded-[20px] bg-[#fafafa] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {t("tracker.hero.kicker")}
              </p>
              <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-zinc-950 sm:text-[22px]">
                {t("tracker.hero.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-600">
                {t("tracker.hero.body")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-zinc-800 sm:w-auto"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("tracker.hero.new")}
              </button>
              <Link
                href="/desk"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 sm:w-auto"
              >
                {t("tracker.hero.desk")}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-900">
                {trackerStats.open} {t("tracker.stats.open")}
              </span>
              <span className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-900">
                {trackerStats.overdue} {t("tracker.stats.overdue")}
              </span>
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-950">
                {trackerStats.atRisk} {t("tracker.stats.atRisk")}
              </span>
              <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[12px] font-semibold text-sky-950">
                {trackerStats.dueSoon} {t("tracker.stats.dueSoon")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--workspace-muted-fg)]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("tracker.filters.searchPlaceholder")}
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] sm:hidden"
              >
                <Filter className="h-3.5 w-3.5" aria-hidden />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-[var(--workspace-accent)]/20 px-1.5 py-0.5 text-[10px] text-[var(--workspace-accent)]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>
            <div
              className={`${
                mobileFiltersOpen ? "flex" : "hidden"
              } flex-wrap items-center gap-2 sm:flex`}
            >
              <div className="flex items-center gap-1.5 text-[var(--workspace-muted-fg)]">
                <Filter className="h-4 w-4" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Filters</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              >
                <option value="">Active</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORG_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              >
                <option value="">All priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {ORG_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
              <input
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                placeholder="Owner (Clerk user id)"
                className="min-w-[160px] rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[13px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)]"
              />
              <NativeDatetimeLocalInput
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
              />
              <NativeDatetimeLocalInput
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as OrgCommitmentListSort)}
                className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              >
                <option value="deadline">Sort: deadline</option>
                <option value="priority">Sort: priority</option>
                <option value="status">Sort: status</option>
                <option value="created_at">Sort: created</option>
                <option value="updated_at">Sort: updated</option>
              </select>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
                className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button
                type="button"
                onClick={() => setAttentionOnly((v) => !v)}
                className={`rounded-xl border px-3 py-2 text-[12px] font-semibold ${
                  attentionOnly
                    ? "border-amber-400/40 bg-amber-500/10 text-[var(--workspace-fg)]"
                    : "border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 text-[var(--workspace-fg)]"
                }`}
              >
                {attentionOnly ? "Attention mode on" : "Attention mode"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setStatusFilter("");
                  setPriorityFilter("");
                  setOwnerFilter("");
                  setDateFrom("");
                  setDateTo("");
                  setSort("deadline");
                  setOrder("asc");
                  setAttentionOnly(false);
                  setMobileFiltersOpen(false);
                }}
                className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[12px] font-semibold text-[var(--workspace-fg)]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
        <div className="space-y-3">
          {loadingList ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : sortedForDisplay.length === 0 ? (
            <p className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-4 py-8 text-center text-[13px] text-[var(--workspace-muted-fg)]">
              No commitments match. Create one or adjust filters.
            </p>
          ) : (
            <ul className="space-y-2">
              {sortedForDisplay.map((c) => {
                const overdue = c.status === "overdue";
                const risk = c.status === "at_risk";
                return (
                  <li key={c.id}>
                    <div
                      className={`rounded-2xl border bg-white p-3 shadow-sm transition ${
                        selectedId === c.id ? "border-zinc-900 ring-2 ring-zinc-900/15" : "border-zinc-200"
                      } ${overdue ? "border-l-4 border-l-red-600" : ""} ${risk && !overdue ? "border-l-4 border-l-amber-500" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(c.id)}
                        className="flex w-full flex-col gap-2 rounded-xl p-1 text-left transition hover:bg-zinc-50"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-[14px] font-semibold leading-snug text-zinc-950">{c.title}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ORG_STATUS_PILL[c.status]}`}
                            >
                              {ORG_STATUS_LABEL[c.status]}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ORG_PRIORITY_PILL[c.priority]}`}
                            >
                              {ORG_PRIORITY_LABEL[c.priority]}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[12px] text-zinc-600">
                          <span className="inline-flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 opacity-80" aria-hidden />
                            {ownerLabel(c.ownerId, user?.id)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 opacity-80" aria-hidden />
                            {new Date(c.deadline).toLocaleString()}
                          </span>
                          {overdue ? (
                            <span className="inline-flex items-center gap-1 font-medium text-red-700">
                              <Clock className="h-3.5 w-3.5" aria-hidden />
                              {t("commitment.metrics.overdue")}
                            </span>
                          ) : null}
                          {risk && !overdue ? (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                              {t("commitment.metrics.atRisk")}
                            </span>
                          ) : null}
                        </div>
                      </button>
                      {c.status !== "completed" ? (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void markCompleteFromList(c.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            {t("tracker.list.complete")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/75 p-4 shadow-sm">
            {!selectedId ? (
              <p className="text-[13px] text-[var(--workspace-muted-fg)]">
                Select a commitment to view details, comments, attachments, and history.
              </p>
            ) : loadingDetail ? (
              <div className="flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : !detail ? (
              <p className="text-[13px] text-[var(--workspace-muted-fg)]">Not found.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[16px] font-semibold leading-snug text-[var(--workspace-fg)]">{detail.title}</h2>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)]"
                  >
                    Close
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDetailTab("main")}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                      detailTab === "main"
                        ? "bg-[var(--workspace-nav-active)] text-[var(--workspace-fg)]"
                        : "text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)]"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab("escalations")}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                      detailTab === "escalations"
                        ? "bg-[var(--workspace-nav-active)] text-[var(--workspace-fg)]"
                        : "text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)]"
                    }`}
                  >
                    Escalations
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ORG_STATUS_PILL[detail.status]}`}>
                    {ORG_STATUS_LABEL[detail.status]}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ORG_PRIORITY_PILL[detail.priority]}`}>
                    {ORG_PRIORITY_LABEL[detail.priority]}
                  </span>
                </div>

                {detailTab === "escalations" ? (
                  <div className="border-t border-[var(--workspace-border)] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                      Escalation history
                    </p>
                    {loadingEscalationTab ? (
                      <div className="mt-2 flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </div>
                    ) : commitmentEscalations.length === 0 ? (
                      <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">No escalations recorded.</p>
                    ) : (
                      <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-[12px]">
                        {commitmentEscalations.map((ex) => (
                          <li
                            key={ex.id}
                            className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 px-3 py-2"
                          >
                            <p className="font-medium text-[var(--workspace-fg)]">{ex.severity}</p>
                            <p className="text-[var(--workspace-muted-fg)]">
                              Triggered {new Date(ex.triggeredAt).toLocaleString()}
                            </p>
                            {ex.resolvedAt ? (
                              <p className="text-[var(--workspace-muted-fg)]">
                                Resolved {new Date(ex.resolvedAt).toLocaleString()}
                              </p>
                            ) : null}
                            {ex.snoozedUntil && new Date(ex.snoozedUntil) > new Date() ? (
                              <p className="text-sky-200">Snoozed until {new Date(ex.snoozedUntil).toLocaleString()}</p>
                            ) : null}
                            {ex.snoozeReason ? <p className="text-[var(--workspace-muted-fg)]">Snooze: {ex.snoozeReason}</p> : null}
                            {ex.resolutionNotes ? (
                              <p className="text-[var(--workspace-muted-fg)]">Notes: {ex.resolutionNotes}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                {detailTab === "main" ? (
                <>
                <div className="space-y-2 text-[13px] text-[var(--workspace-muted-fg)]">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Title
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[var(--workspace-fg)]"
                  />
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Description
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[var(--workspace-fg)]"
                  />
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Owner (Clerk user id)
                  </label>
                  <input
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]"
                  />
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Deadline
                  </label>
                  <NativeDatetimeLocalInput
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[var(--workspace-fg)]"
                  />
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as (typeof PRIORITIES)[number])}
                    className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[var(--workspace-fg)]"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {ORG_PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveEdit()}
                      className="rounded-full bg-[var(--workspace-fg)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)] disabled:opacity-50"
                    >
                      Save changes
                    </button>
                    {detail.status !== "completed" ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void markComplete(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[12px] font-semibold text-emerald-100 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Mark complete
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void markComplete(false)}
                        className="rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void removeCommitment()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-400/35 px-4 py-2 text-[12px] font-semibold text-red-200 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Archive
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--workspace-border)] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Comments
                  </p>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-[13px]">
                    {detail.comments.map((cm) => (
                      <li key={cm.id} className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 px-3 py-2">
                        <p className="whitespace-pre-wrap text-[var(--workspace-fg)]">{cm.content}</p>
                        <p className="mt-1 text-[10px] text-[var(--workspace-muted-fg)]">
                          {new Date(cm.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={(e) => void postComment(e)} className="mt-2 flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="min-w-0 flex-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                    />
                    <button
                      type="submit"
                      disabled={saving || !comment.trim()}
                      className="rounded-full bg-[var(--workspace-accent)]/90 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      Send
                    </button>
                  </form>
                </div>

                <div className="border-t border-[var(--workspace-border)] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Attachments
                  </p>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {detail.attachments.map((a) => (
                      <li key={a.id}>
                        <a
                          href={a.fileUrl}
                          className="text-[var(--workspace-accent)] hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-2 block text-[12px] text-[var(--workspace-muted-fg)]">
                    <span className="sr-only">Upload file</span>
                    <input
                      type="file"
                      disabled={saving}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadFile(f);
                        e.target.value = "";
                      }}
                      className="text-[12px] text-[var(--workspace-fg)]"
                    />
                  </label>
                </div>

                <div className="border-t border-[var(--workspace-border)] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    Depends on
                  </p>
                  <ul className="mt-2 space-y-1 text-[13px] text-[var(--workspace-fg)]">
                    {detail.dependencies.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => openDetail(d.dependsOnCommitmentId)}
                          className="text-left text-[var(--workspace-accent)] hover:underline"
                        >
                          {detail.dependencyTitles[d.dependsOnCommitmentId] ?? d.dependsOnCommitmentId}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={depPick}
                      onChange={(e) => setDepPick(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
                    >
                      <option value="">Link another commitment…</option>
                      {rows
                        .filter((r) => r.id !== selectedId)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={saving || !depPick}
                      onClick={() => void addDep()}
                      className="rounded-full border border-[var(--workspace-border)] px-3 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--workspace-border)] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    History
                  </p>
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-[12px] text-[var(--workspace-muted-fg)]">
                    {detail.history.map((h) => (
                      <li key={h.id}>
                        <span className="font-medium text-[var(--workspace-fg)]">{h.fieldChanged}</span>{" "}
                        {h.oldValue ?? "—"} → {h.newValue ?? "—"}{" "}
                        <span className="text-[10px]">({new Date(h.changedAt).toLocaleString()})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                </>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] p-5 shadow-2xl">
            <h3 className="text-[16px] font-semibold text-[var(--workspace-fg)]">New commitment</h3>
            <form onSubmit={(e) => void submitCreate(e)} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">Title *</label>
                <input
                  required
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">Description</label>
                <textarea
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">Owner *</label>
                <input
                  required
                  value={cOwner}
                  onChange={(e) => setCOwner(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">Deadline *</label>
                <NativeDatetimeLocalInput
                  required
                  value={cDeadline}
                  onChange={(e) => setCDeadline(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">Priority *</label>
                <select
                  value={cPriority}
                  onChange={(e) => setCPriority(e.target.value as (typeof PRIORITIES)[number])}
                  className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {ORG_PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[var(--workspace-fg)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-canvas)] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

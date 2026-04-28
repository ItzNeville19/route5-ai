"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  ClipboardList,
  HelpCircle,
  Send,
} from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { resolveWorkspaceSurfaceMode } from "@/lib/workspace-dashboard-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import EmployeeCommitmentUpdateDrawer from "@/components/workspace/EmployeeCommitmentUpdateDrawer";

type ActivityRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  completed_at: string | null;
  deadline: string;
};

function formatDue(iso: string): string | null {
  if (!iso?.trim()) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

function statusPhrase(status: string): string {
  const s = status.replace(/_/g, " ").toLowerCase();
  const map: Record<string, string> = {
    "not started": "Not started",
    "in progress": "In progress",
    "on track": "On track",
    "at risk": "Needs attention",
    overdue: "Late",
    completed: "Done",
  };
  return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

function dueRelation(deadlineIso: string): "overdue" | "today" | "soon" | "none" {
  if (!deadlineIso?.trim()) return "none";
  const d = new Date(deadlineIso);
  if (Number.isNaN(d.getTime())) return "none";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTomorrow = startToday + 86400000;
  const t = d.getTime();
  if (t < startToday) return "overdue";
  if (t < startTomorrow) return "today";
  const weekAhead = startToday + 7 * 86400000;
  if (t < weekAhead) return "soon";
  return "none";
}

function duePlainEnglish(deadlineIso: string): string | null {
  const rel = dueRelation(deadlineIso);
  const formatted = formatDue(deadlineIso);
  if (!formatted) return null;
  switch (rel) {
    case "overdue":
      return `Was due ${formatted} — catch up when you can`;
    case "today":
      return `Due today (${formatted})`;
    case "soon":
      return `Due ${formatted}`;
    default:
      return `Due ${formatted}`;
  }
}

export default function EmployeePreviewPanel() {
  const { orgRole, organizationId } = useWorkspaceData();
  const { prefs } = useWorkspaceExperience();
  const search = useSearchParams();
  const tasksHref = useMemo(() => {
    return search.get("view") === "employee"
      ? "/workspace/my-inbox?view=employee"
      : "/workspace/my-inbox";
  }, [search]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [commitmentUpdateRow, setCommitmentUpdateRow] = useState<ActivityRow | null>(null);

  const canOrg = orgRole === "admin" || orgRole === "manager";
  const surfaceMode = resolveWorkspaceSurfaceMode(canOrg, search.get("view"), prefs.defaultWorkspaceView);
  /** Members never assign; employee lens hides assign even for admins/leads (IC preview). */
  const canAssign = canOrg && surfaceMode !== "employee";

  const loadActivity = useCallback(async (quiet?: boolean) => {
    if (!quiet) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/dashboard/activity?scope=self&limit=48", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { activity?: ActivityRow[]; error?: string };
      if (res.ok) {
        setActivity(data.activity ?? []);
        setLoadError(null);
      } else if (!quiet) {
        setLoadError(data.error ?? "Could not load your tasks.");
      }
    } catch {
      if (!quiet) setLoadError("Could not load your tasks.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity(false);
  }, [loadActivity]);

  useEffect(() => {
    const onRefresh = () => void loadActivity(true);
    window.addEventListener("route5:commitments-changed", onRefresh);
    return () => window.removeEventListener("route5:commitments-changed", onRefresh);
  }, [loadActivity]);

  useEffect(() => {
    if (!organizationId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`org-dashboard:${organizationId}`);
    channel.on("broadcast", { event: "refresh" }, () => {
      void loadActivity(true);
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [organizationId, loadActivity]);

  const { activeRows, doneRows, overdueCount, dueTodayCount } = useMemo(() => {
    const active: ActivityRow[] = [];
    const done: ActivityRow[] = [];
    for (const row of activity) {
      if (row.completed_at) done.push(row);
      else active.push(row);
    }
    active.sort((a, b) => {
      const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return ad - bd;
    });
    done.sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
    let overdue = 0;
    let dueToday = 0;
    for (const row of active) {
      const rel = dueRelation(row.deadline);
      if (rel === "overdue") overdue += 1;
      else if (rel === "today") dueToday += 1;
    }
    return { activeRows: active, doneRows: done, overdueCount: overdue, dueTodayCount: dueToday };
  }, [activity]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--workspace-accent)_35%,transparent)] border-t-[var(--workspace-accent)]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-4 text-[13px] text-amber-100/95">
        <p>{loadError}</p>
        <button
          type="button"
          onClick={() => void loadActivity(false)}
          className="mt-3 rounded-lg border border-amber-400/35 px-3 py-1.5 text-[12px] font-semibold text-amber-50 transition hover:bg-amber-500/15"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-4 animate-[route5-page-enter_0.35s_ease-out_both] pb-6">
      <EmployeeCommitmentUpdateDrawer
        row={commitmentUpdateRow}
        onClose={() => setCommitmentUpdateRow(null)}
        onApplied={() => window.dispatchEvent(new Event("route5:commitments-changed"))}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 text-[12px] text-[var(--workspace-muted-fg)]">
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Work shortcuts">
          <Link
            href={tasksHref}
            className="font-semibold text-[var(--workspace-accent)] transition hover:opacity-90"
          >
            My inbox
          </Link>
          <Link
            href="/workspace/notifications"
            className="inline-flex items-center gap-1 text-[var(--workspace-fg)] transition hover:text-[var(--workspace-accent)]"
          >
            <Bell className="h-3.5 w-3.5 opacity-80" aria-hidden />
            Alerts
          </Link>
          <Link href="/workspace/help" className="inline-flex items-center gap-1 text-[var(--workspace-fg)] transition hover:text-[var(--workspace-accent)]">
            <HelpCircle className="h-3.5 w-3.5 opacity-80" aria-hidden />
            Help
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={tasksHref}
            className="route5-pressable inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--workspace-accent)_40%,var(--workspace-border))] bg-[color-mix(in_srgb,var(--workspace-accent)_12%,transparent)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)]"
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Open list
          </Link>
          {canAssign ? (
            <Link
              href="/workspace/assign-task"
              className="route5-pressable inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-fg)_04%,transparent)] px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)] hover:border-[color-mix(in_srgb,var(--workspace-accent)_45%,var(--workspace-border))]"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              Assign
            </Link>
          ) : null}
        </div>
      </div>

      <section className="rounded-[18px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-4 backdrop-blur-sm md:px-5 md:py-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Your open commitments</h2>
            <p className="mt-0.5 text-[13px] text-[var(--workspace-muted-fg)]">
              {activeRows.length === 0
                ? "Nothing on your list right now."
                : `${activeRows.length} commitment${activeRows.length === 1 ? "" : "s"}${overdueCount ? ` · ${overdueCount} late` : ""}${
                    dueTodayCount ? ` · ${dueTodayCount} due today` : ""
                  }`}
            </p>
          </div>
        </div>

        <ul className="mt-3 divide-y divide-[var(--workspace-border)]">
          {activeRows.length === 0 ? (
            <li className="py-10 text-center">
              <p className="text-[15px] font-medium text-[var(--workspace-fg)]">You&apos;re all caught up</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                New assignments appear here with due dates in plain language. Check back after your lead assigns work.
              </p>
            </li>
          ) : (
            activeRows.map((row) => {
              const rel = dueRelation(row.deadline);
              const dueLine = duePlainEnglish(row.deadline);
              return (
                <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5 first:pt-1">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={tasksHref}
                      className="text-[15px] font-semibold text-[var(--workspace-fg)] transition hover:text-[var(--workspace-accent)]"
                    >
                      {row.title}
                    </Link>
                    <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">{statusPhrase(row.status)}</p>
                    {dueLine ? (
                      <p
                        className={`mt-1 text-[12px] ${
                          rel === "overdue"
                            ? "font-medium text-[var(--workspace-danger-fg)]"
                            : rel === "today"
                              ? "font-medium text-[var(--workspace-accent)]"
                              : "text-[var(--workspace-muted-fg)]"
                        }`}
                      >
                        {dueLine}
                      </p>
                    ) : (
                      <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">No due date set</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommitmentUpdateRow(row)}
                    className="route5-pressable shrink-0 rounded-full border border-[color-mix(in_srgb,var(--workspace-accent)_38%,var(--workspace-border))] bg-[color-mix(in_srgb,var(--workspace-accent)_10%,transparent)] px-3.5 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)]"
                  >
                    Update
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {doneRows.length > 0 ? (
        <section className="rounded-[18px] border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-surface)_92%,var(--workspace-canvas)_8%)]">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--workspace-nav-hover)] md:px-5"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--workspace-fg)]">
              <CircleCheck className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
              Completed items
              <span className="rounded-full bg-[var(--workspace-nav-chip)] px-2 py-0.5 text-[10px] font-bold text-[var(--workspace-muted-fg)]">
                {doneRows.length}
              </span>
            </span>
            {showDone ? (
              <ChevronUp className="h-5 w-5 text-[var(--workspace-muted-fg)]" aria-hidden />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--workspace-muted-fg)]" aria-hidden />
            )}
          </button>
          {showDone ? (
            <ul className="border-t border-[var(--workspace-border)] px-4 pb-4 pt-1 md:px-5">
              {doneRows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--workspace-border)] py-3 last:border-0"
                >
                  <span className="text-[13px] text-[var(--workspace-muted-fg)] line-through decoration-[var(--workspace-border)]">
                    {row.title}
                  </span>
                  <span className="text-[11px] tabular-nums text-[var(--workspace-muted-fg)]">
                    Finished{" "}
                    {row.completed_at
                      ? new Date(row.completed_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  ClipboardList,
  ListTodo,
  Send,
} from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

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

export default function EmployeePreviewPanel() {
  const { user } = useUser();
  const { orgRole } = useWorkspaceData();
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const firstName =
    user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "there";

  const canAssign = orgRole === "admin" || orgRole === "manager";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/dashboard/activity?scope=self&limit=48", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { activity?: ActivityRow[] };
      if (!cancelled && res.ok) setActivity(data.activity ?? []);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { activeRows, doneRows } = useMemo(() => {
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
    return { activeRows: active, doneRows: done };
  }, [activity]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-500/25 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 animate-[route5-page-enter_0.35s_ease-out_both]">
      <header className="rounded-[26px] border border-white/[0.06] bg-[linear-gradient(155deg,rgba(10,36,44,0.48),rgba(5,12,18,0.97))] px-7 py-8 shadow-[0_32px_100px_-58px_rgba(14,116,144,0.32)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/28 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/85">
          <ListTodo className="h-3.5 w-3.5" />
          My work
        </div>
        <h1 className="mt-5 text-[clamp(1.5rem,3vw,1.85rem)] font-semibold tracking-tight text-white">
          Hi {firstName} — here&apos;s what&apos;s on your plate
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/[0.72]">
          Commitments your team assigned to you show up here. Open one to update status. Finished work moves below — out of the way until you want to review it.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/workspace/commitments"
            className="route5-pressable inline-flex items-center gap-2 rounded-full border border-cyan-500/32 bg-cyan-950/45 px-5 py-2.5 text-sm font-semibold text-cyan-50 shadow-[0_16px_48px_-30px_rgba(8,145,178,0.4)]"
          >
            <ClipboardList className="h-4 w-4" />
            View all commitments
          </Link>
          {canAssign ? (
            <Link
              href="/workspace/assign-task"
              className="route5-pressable inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white/90 hover:border-cyan-500/28 hover:bg-cyan-950/22"
            >
              <Send className="h-4 w-4" />
              Assign work to someone
            </Link>
          ) : null}
        </div>
      </header>

      <section className="rounded-[22px] border border-white/[0.06] bg-black/24 p-6 backdrop-blur-sm md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Active</h2>
            <p className="mt-1 text-sm text-white/50">
              {activeRows.length === 0 ? "Nothing open — you’re caught up." : `${activeRows.length} open`}
            </p>
          </div>
        </div>
        <ul className="mt-5 divide-y divide-white/[0.07]">
          {activeRows.length === 0 ? (
            <li className="py-14 text-center">
              <p className="text-sm font-medium text-white/85">You&apos;re clear.</p>
              <p className="mt-2 text-sm text-white/45">New assignments will appear here.</p>
            </li>
          ) : (
            activeRows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/workspace/commitments`}
                    className="text-[15px] font-semibold text-white transition hover:text-emerald-200/95"
                  >
                    {row.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/45">
                    <span>{statusPhrase(row.status)}</span>
                    {formatDue(row.deadline) ? (
                      <span className="tabular-nums text-white/55">Due {formatDue(row.deadline)}</span>
                    ) : null}
                  </div>
                </div>
                <Link
                  href="/workspace/commitments"
                  className="route5-pressable shrink-0 rounded-full border border-cyan-500/28 bg-cyan-950/35 px-4 py-2 text-xs font-semibold text-cyan-100"
                >
                  Update
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      {doneRows.length > 0 ? (
        <section className="rounded-[22px] border border-white/[0.06] bg-black/[0.18]">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-white/75">
              <CircleCheck className="h-4 w-4 text-cyan-400/82" />
              Completed
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/60">
                {doneRows.length}
              </span>
            </span>
            {showDone ? <ChevronUp className="h-5 w-5 text-white/35" /> : <ChevronDown className="h-5 w-5 text-white/35" />}
          </button>
          {showDone ? (
            <ul className="border-t border-white/[0.06] px-6 pb-5 pt-2">
              {doneRows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] py-3.5 last:border-0"
                >
                  <span className="text-[13px] text-white/55 line-through decoration-white/25">{row.title}</span>
                  <span className="text-[11px] tabular-nums text-white/35">
                    Done{" "}
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

      <div className="flex justify-center pb-4">
        <Link
          href="/workspace/commitments"
          className="route5-pressable inline-flex items-center gap-2 text-sm font-semibold text-cyan-400/95 hover:text-cyan-200"
        >
          Go to commitments <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

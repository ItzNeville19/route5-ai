"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Flag, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import {
  ORG_PRIORITY_LABEL,
  ORG_PRIORITY_PILL,
  ORG_STATUS_LABEL,
  ORG_STATUS_PILL,
} from "@/lib/org-commitments/tracker-constants";

type ListPayload = {
  orgId?: string;
  commitments?: OrgCommitmentRow[];
};

export default function MyInboxPage() {
  const { user } = useUser();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<OrgCommitmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const owner = user?.id ? encodeURIComponent(user.id) : "";
      const res = await fetch(`/api/commitments?owner=${owner}&sort=deadline&order=asc`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as ListPayload;
      if (!res.ok) {
        setRows([]);
        return;
      }
      setOrgId(data.orgId ?? null);
      setRows(data.commitments ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!orgId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`org-commitments:${orgId}`);
    channel.on("broadcast", { event: "change" }, () => {
      void load();
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, user?.id]);

  async function setDone(id: string, done: boolean) {
    setSavingId(id);
    try {
      await fetch(`/api/commitments/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(done ? { completed: true, status: "completed" } : { completed: false, status: "in_progress" }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function setBlocked(id: string) {
    setSavingId(id);
    try {
      await fetch(`/api/commitments/${id}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Blocked: waiting on clarification or dependency." }),
      });
      await fetch(`/api/commitments/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false, status: "at_risk" }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  }

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
    [rows]
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4 pb-16">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-r5-text-secondary">
          MY WORKSPACE
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-r5-text-primary">My Inbox</h1>
        <p className="mt-1 text-[13px] text-r5-text-secondary">
          Commitments assigned to you, sorted by deadline.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-r5-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading inbox…
          </div>
        ) : sorted.length === 0 ? (
          <p className="px-4 py-8 text-[13px] text-r5-text-secondary">Nothing assigned right now.</p>
        ) : (
          <ul>
            {sorted.map((task) => {
              const busy = savingId === task.id;
              return (
                <li key={task.id} className="border-b border-slate-200/80 px-4 py-3.5 last:border-0 dark:border-slate-700/70">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-r5-text-primary">{task.title}</p>
                      <p className="mt-0.5 text-[12px] text-r5-text-secondary">
                        Assigned by admin • Due {new Date(task.deadline).toLocaleString()}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ORG_PRIORITY_PILL[task.priority]}`}>
                          {ORG_PRIORITY_LABEL[task.priority]}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ORG_STATUS_PILL[task.status]}`}>
                          {ORG_STATUS_LABEL[task.status]}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setDone(task.id, false)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setBlocked(task.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 disabled:opacity-50 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-200"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Blocked
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setDone(task.id, true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 disabled:opacity-50 dark:border-emerald-700/50 dark:bg-emerald-500/10 dark:text-emerald-200"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="inline-flex items-center gap-1.5 text-[12px] text-r5-text-secondary">
        <AlertTriangle className="h-3.5 w-3.5" />
        Blocked marks attention for admins on org views.
      </p>
    </div>
  );
}

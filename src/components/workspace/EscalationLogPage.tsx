"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NativeDatetimeLocalInput } from "@/components/ui/native-datetime-fields";
import { Loader2, RefreshCcw } from "lucide-react";

type EscalationApiRow = {
  id: string;
  commitmentId: string;
  severity: "warning" | "urgent" | "critical" | "overdue";
  triggeredAt: string;
  resolvedAt: string | null;
  snoozedUntil: string | null;
  snoozeReason: string | null;
  resolutionNotes: string | null;
  commitmentTitle: string;
  commitmentDeadline: string;
  ownerDisplayName: string;
  isOpen: boolean;
  isSnoozedActive: boolean;
  ageHours: number;
};

type EscalationApiSummary = {
  total: number;
  open: number;
  snoozed: number;
  resolved: number;
  overdue: number;
  critical: number;
};

function severityPillClass(sev: EscalationApiRow["severity"]): string {
  switch (sev) {
    case "warning":
      return "border-amber-300/50 bg-amber-500/15 text-amber-100";
    case "urgent":
      return "border-orange-400/40 bg-orange-500/15 text-orange-100";
    case "critical":
      return "border-red-400/50 bg-red-500/15 text-red-100";
    case "overdue":
      return "border-rose-900/60 bg-rose-950/50 text-rose-100";
    default:
      return "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]";
  }
}

export default function EscalationLogPage() {
  const [rows, setRows] = useState<EscalationApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<EscalationApiSummary>({
    total: 0,
    open: 0,
    snoozed: 0,
    resolved: 0,
    overdue: 0,
    critical: 0,
  });
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "snoozed" | "resolved">("all");
  const [commitmentId, setCommitmentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolveNotesById, setResolveNotesById] = useState<Record<string, string>>({});
  const [snoozeReasonById, setSnoozeReasonById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (severity) p.set("severity", severity);
      if (commitmentId.trim()) p.set("commitment_id", commitmentId.trim());
      if (dateFrom) p.set("dateFrom", new Date(dateFrom).toISOString());
      if (dateTo) p.set("dateTo", new Date(dateTo).toISOString());
      if (status === "open") {
        p.set("resolved", "open");
        p.set("snoozed", "no");
      } else if (status === "snoozed") {
        p.set("resolved", "open");
        p.set("snoozed", "yes");
      } else if (status === "resolved") {
        p.set("resolved", "resolved");
      } else {
        p.set("resolved", "all");
      }
      p.set("limit", "300");
      const res = await fetch(`/api/escalations?${p.toString()}`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        escalations?: EscalationApiRow[];
        summary?: EscalationApiSummary;
        generatedAt?: string;
      };
      if (res.ok) {
        setRows(data.escalations ?? []);
        setGeneratedAt(data.generatedAt ?? null);
        setSummary(
          data.summary ?? {
            total: (data.escalations ?? []).length,
            open: (data.escalations ?? []).filter((x) => x.isOpen && !x.isSnoozedActive).length,
            snoozed: (data.escalations ?? []).filter((x) => x.isOpen && x.isSnoozedActive).length,
            resolved: (data.escalations ?? []).filter((x) => !x.isOpen).length,
            overdue: (data.escalations ?? []).filter((x) => x.severity === "overdue" && x.isOpen).length,
            critical: (data.escalations ?? []).filter((x) => x.severity === "critical" && x.isOpen).length,
          }
        );
      }
    } finally {
      setLoading(false);
    }
  }, [severity, status, commitmentId, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(t);
  }, [autoRefresh, load]);

  const staleOpenCount = useMemo(
    () => rows.filter((r) => r.isOpen && r.ageHours >= 24).length,
    [rows]
  );

  const resolveEscalation = useCallback(
    async (row: EscalationApiRow) => {
      const notes = (resolveNotesById[row.id] ?? "").trim();
      if (!notes) return;
      setBusyId(row.id);
      try {
        const res = await fetch(`/api/escalations/${encodeURIComponent(row.id)}/resolve`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution_notes: notes }),
        });
        if (res.ok) {
          setResolveNotesById((prev) => ({ ...prev, [row.id]: "" }));
          await load();
        }
      } finally {
        setBusyId(null);
      }
    },
    [load, resolveNotesById]
  );

  const snoozeEscalation = useCallback(
    async (row: EscalationApiRow, hours: number) => {
      const reason =
        (snoozeReasonById[row.id] ?? "").trim() || "Active remediation in progress";
      const until = new Date(Date.now() + hours * 3_600_000).toISOString();
      setBusyId(row.id);
      try {
        const res = await fetch(`/api/escalations/${encodeURIComponent(row.id)}/snooze`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snooze_reason: reason, snoozed_until: until }),
        });
        if (res.ok) {
          setSnoozeReasonById((prev) => ({ ...prev, [row.id]: reason }));
          await load();
        }
      } finally {
        setBusyId(null);
      }
    },
    [load, snoozeReasonById]
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1200px] flex-col gap-5 pb-24">
      <section className="rounded-[22px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold text-[var(--workspace-fg)]">Escalation log</h1>
            <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">
              Full history of org commitment escalations. Filters apply instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[12px] text-[var(--workspace-muted-fg)]">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto refresh
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[12px] text-[var(--workspace-fg)] hover:bg-[var(--workspace-surface)]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40 px-3 py-2">
            <p className="text-[11px] text-[var(--workspace-muted-fg)]">Open</p>
            <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">{summary.open}</p>
          </div>
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40 px-3 py-2">
            <p className="text-[11px] text-[var(--workspace-muted-fg)]">Snoozed</p>
            <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">{summary.snoozed}</p>
          </div>
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40 px-3 py-2">
            <p className="text-[11px] text-[var(--workspace-muted-fg)]">Critical</p>
            <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">{summary.critical}</p>
          </div>
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40 px-3 py-2">
            <p className="text-[11px] text-[var(--workspace-muted-fg)]">Overdue</p>
            <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">{summary.overdue}</p>
          </div>
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40 px-3 py-2">
            <p className="text-[11px] text-[var(--workspace-muted-fg)]">Resolved</p>
            <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">{summary.resolved}</p>
          </div>
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40 px-3 py-2">
            <p className="text-[11px] text-[var(--workspace-muted-fg)]">Stale open</p>
            <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">{staleOpenCount}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[var(--workspace-muted-fg)]">
          {generatedAt ? `Updated ${new Date(generatedAt).toLocaleTimeString()}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
          >
            <option value="">All severities</option>
            <option value="warning">Warning</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
          >
            <option value="all">All statuses</option>
            <option value="open">Open (active)</option>
            <option value="snoozed">Snoozed</option>
            <option value="resolved">Resolved</option>
          </select>
          <input
            value={commitmentId}
            onChange={(e) => setCommitmentId(e.target.value)}
            placeholder="Commitment id"
            className="min-w-[200px] rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]"
          />
          <NativeDatetimeLocalInput
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
          />
          <NativeDatetimeLocalInput
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
          />
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[var(--workspace-muted-fg)]">No escalations match.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`/workspace/commitments?id=${encodeURIComponent(e.commitmentId)}`}
                  className="text-[14px] font-semibold text-[var(--workspace-fg)] hover:text-[var(--workspace-accent)]"
                >
                  {e.commitmentTitle}
                </Link>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityPillClass(e.severity)}`}
                >
                  {e.severity}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">
                Owner {e.ownerDisplayName} · Deadline {new Date(e.commitmentDeadline).toLocaleString()} · Triggered{" "}
                {new Date(e.triggeredAt).toLocaleString()} · Age {e.ageHours}h
              </p>
              <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
                {e.resolvedAt ? (
                  <>Resolved {new Date(e.resolvedAt).toLocaleString()}</>
                ) : e.isSnoozedActive && e.snoozedUntil ? (
                  <>Snoozed until {new Date(e.snoozedUntil).toLocaleString()}</>
                ) : (
                  <>Open</>
                )}
              </p>
              {e.snoozeReason ? (
                <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">Snooze reason: {e.snoozeReason}</p>
              ) : null}
              {e.resolutionNotes ? (
                <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">Resolution: {e.resolutionNotes}</p>
              ) : null}
              {e.isOpen ? (
                <div className="mt-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/35 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === e.id}
                      onClick={() => void snoozeEscalation(e, 4)}
                      className="rounded-lg border border-[var(--workspace-border)] px-2.5 py-1.5 text-[12px] text-[var(--workspace-fg)] hover:bg-[var(--workspace-surface)] disabled:opacity-50"
                    >
                      Snooze 4h
                    </button>
                    <button
                      type="button"
                      disabled={busyId === e.id}
                      onClick={() => void snoozeEscalation(e, 24)}
                      className="rounded-lg border border-[var(--workspace-border)] px-2.5 py-1.5 text-[12px] text-[var(--workspace-fg)] hover:bg-[var(--workspace-surface)] disabled:opacity-50"
                    >
                      Snooze 24h
                    </button>
                    <input
                      value={snoozeReasonById[e.id] ?? ""}
                      onChange={(ev) =>
                        setSnoozeReasonById((prev) => ({ ...prev, [e.id]: ev.target.value }))
                      }
                      placeholder="Snooze reason (required)"
                      className="min-w-[220px] flex-1 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/45 px-2.5 py-1.5 text-[12px] text-[var(--workspace-fg)]"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      value={resolveNotesById[e.id] ?? ""}
                      onChange={(ev) =>
                        setResolveNotesById((prev) => ({ ...prev, [e.id]: ev.target.value }))
                      }
                      placeholder="Resolution notes (required)"
                      className="min-w-[220px] flex-1 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/45 px-2.5 py-1.5 text-[12px] text-[var(--workspace-fg)]"
                    />
                    <button
                      type="button"
                      disabled={busyId === e.id || !(resolveNotesById[e.id] ?? "").trim()}
                      onClick={() => void resolveEscalation(e)}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[12px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

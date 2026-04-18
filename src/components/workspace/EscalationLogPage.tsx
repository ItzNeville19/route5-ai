"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "snoozed" | "resolved">("all");
  const [commitmentId, setCommitmentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
      const data = (await res.json().catch(() => ({}))) as { escalations?: EscalationApiRow[] };
      if (res.ok) setRows(data.escalations ?? []);
    } finally {
      setLoading(false);
    }
  }, [severity, status, commitmentId, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1200px] flex-col gap-5 pb-24">
      <section className="rounded-[22px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-5">
        <h1 className="text-[20px] font-semibold text-[var(--workspace-fg)]">Escalation log</h1>
        <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">
          Full history of org commitment escalations. Filters apply instantly.
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
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
          />
          <input
            type="datetime-local"
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
                {new Date(e.triggeredAt).toLocaleString()}
              </p>
              <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
                {e.resolvedAt ? (
                  <>Resolved {new Date(e.resolvedAt).toLocaleString()}</>
                ) : e.snoozedUntil && new Date(e.snoozedUntil) > new Date() ? (
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { isCompletedRow } from "@/lib/feed/group-commitments";
import { ownerHoverLabelFromId } from "@/components/feed/feed-user-display";

type OwnerRollup = {
  ownerId: string;
  ownerLabel: string;
  overdue: number;
  atRisk: number;
  onTrack: number;
  totalOpen: number;
};

function executionHealthScore(rows: OrgCommitmentRow[]): number {
  const open = rows.filter((r) => !isCompletedRow(r));
  if (open.length === 0) return 100;
  let score = 100;
  for (const row of open) {
    if (row.status === "overdue") score -= 10;
    else if (row.status === "at_risk") score -= 5;
    else score -= 1;
  }
  return Math.max(0, Math.round(score));
}

function scoreTone(score: number): string {
  if (score < 60) return "text-r5-status-overdue";
  if (score < 80) return "text-r5-status-at-risk";
  return "text-r5-status-completed";
}

export default function LeadershipPage() {
  const [rows, setRows] = useState<OrgCommitmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/commitments?sort=deadline&order=asc", {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          commitments?: OrgCommitmentRow[];
        };
        if (!cancelled && res.ok) {
          setRows(data.commitments ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openRows = useMemo(() => rows.filter((r) => !isCompletedRow(r)), [rows]);
  const onTrackCount = useMemo(
    () => openRows.filter((r) => r.status === "on_track" || r.status === "in_progress").length,
    [openRows]
  );
  const atRiskCount = useMemo(
    () => openRows.filter((r) => r.status === "at_risk").length,
    [openRows]
  );
  const overdueRows = useMemo(
    () => openRows.filter((r) => r.status === "overdue"),
    [openRows]
  );
  const health = useMemo(() => executionHealthScore(rows), [rows]);

  const ownerBreakdown = useMemo<OwnerRollup[]>(() => {
    const byOwner = new Map<string, OwnerRollup>();
    for (const row of openRows) {
      const ownerId = row.ownerId?.trim() || "unassigned";
      const current = byOwner.get(ownerId) ?? {
        ownerId,
        ownerLabel: ownerHoverLabelFromId(ownerId, undefined, ""),
        overdue: 0,
        atRisk: 0,
        onTrack: 0,
        totalOpen: 0,
      };
      current.totalOpen += 1;
      if (row.status === "overdue") current.overdue += 1;
      else if (row.status === "at_risk") current.atRisk += 1;
      else current.onTrack += 1;
      byOwner.set(ownerId, current);
    }
    return [...byOwner.values()].sort((a, b) => b.overdue - a.overdue || b.atRisk - a.atRisk || b.totalOpen - a.totalOpen);
  }, [openRows]);

  return (
    <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] space-y-[var(--r5-space-5)]">
      <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/60 p-[var(--r5-space-5)]">
        <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">Execution health</p>
        {loading ? (
          <div className="mt-[var(--r5-space-3)] h-10 w-28 animate-pulse rounded-[var(--r5-radius-md)] bg-r5-border-subtle/35" />
        ) : (
          <div className="mt-[var(--r5-space-3)] flex items-end gap-[var(--r5-space-2)]">
            <p className={`text-[length:var(--r5-font-display)] font-semibold leading-none ${scoreTone(health)}`}>{health}</p>
            <p className="pb-[var(--r5-space-1)] text-[length:var(--r5-font-subheading)] text-r5-text-secondary">/ 100</p>
          </div>
        )}
      </section>

      <section className="grid gap-[var(--r5-space-3)] sm:grid-cols-3">
        <div className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-4)]">
          <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">On track</p>
          <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-stat)] font-semibold text-r5-status-completed">{onTrackCount}</p>
        </div>
        <div className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-4)]">
          <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">At risk</p>
          <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-stat)] font-semibold text-r5-status-at-risk">{atRiskCount}</p>
        </div>
        <div className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-4)]">
          <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">Overdue</p>
          <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-stat)] font-semibold text-r5-status-overdue">{overdueRows.length}</p>
        </div>
      </section>

      <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
        <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">Owner breakdown</h2>
        <div className="mt-[var(--r5-space-3)] overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[length:var(--r5-font-body)]">
            <thead>
              <tr className="border-b border-r5-border-subtle/70 text-r5-text-secondary">
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Owner</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Overdue</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">At risk</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">On track</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {ownerBreakdown.map((owner) => (
                <tr key={owner.ownerId} className="border-b border-r5-border-subtle/40 text-r5-text-primary">
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)]">{owner.ownerLabel}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] text-r5-status-overdue">{owner.overdue}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] text-r5-status-at-risk">{owner.atRisk}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] text-r5-status-completed">{owner.onTrack}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)]">{owner.totalOpen}</td>
                </tr>
              ))}
              {ownerBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-[var(--r5-space-2)] py-[var(--r5-space-4)] text-r5-text-secondary">No open commitments.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
        <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">Overdue commitments</h2>
        {overdueRows.length === 0 ? (
          <p className="mt-[var(--r5-space-3)] text-[length:var(--r5-font-body)] text-r5-text-secondary">No overdue commitments.</p>
        ) : (
          <ul className="mt-[var(--r5-space-3)] space-y-[var(--r5-space-2)]">
            {overdueRows.map((row) => (
              <li key={row.id} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-[var(--r5-space-2)]">
                <p className="text-[length:var(--r5-font-subheading)] text-r5-text-primary">{row.title}</p>
                <p className="text-[length:var(--r5-font-body)] text-r5-text-secondary">{ownerHoverLabelFromId(row.ownerId, undefined, "")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

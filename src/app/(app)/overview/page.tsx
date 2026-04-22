"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { isCompletedRow } from "@/lib/feed/group-commitments";
import { computeWorkspaceExecutionHealth } from "@/lib/execution-health";
import { clerkDisplayName } from "@/components/feed/feed-user-display";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";
import { orgCommitmentsHref } from "@/lib/workspace/commitment-links";

type OwnerRollup = {
  ownerId: string;
  ownerLabel: string;
  overdue: number;
  atRisk: number;
  onTrack: number;
  total: number;
  totalOpen: number;
  completionRate: number;
  responseRate: number;
  escalationRate: number;
  reliabilityScore: number;
  pressureScore: number;
};

type BreakdownPattern = {
  label: string;
  count: number;
};

function scoreTone(score: number): string {
  if (score < 60) return "text-r5-status-overdue";
  if (score < 80) return "text-r5-status-at-risk";
  return "text-r5-status-completed";
}

function overdueDays(deadlineIso: string): number {
  const due = new Date(deadlineIso).getTime();
  if (Number.isNaN(due)) return 0;
  const ms = Date.now() - due;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function staleDays(lastActivityIso: string): number {
  const ts = new Date(lastActivityIso).getTime();
  if (Number.isNaN(ts)) return 0;
  const ms = Date.now() - ts;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export default function LeadershipPage() {
  const { user } = useUser();
  const { displayName: memberDisplayName } = useMemberDirectory();
  const selfId = user?.id;
  const selfDisplayName = clerkDisplayName(user);
  const [rows, setRows] = useState<OrgCommitmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedAtIso, setLoadedAtIso] = useState<string | null>(null);

  const resolveAdministratorLabel = useMemo(
    () => (ownerId: string) =>
      ownerId === "unassigned"
        ? "Unassigned"
        : memberDisplayName(ownerId, selfId, selfDisplayName),
    [memberDisplayName, selfId, selfDisplayName]
  );

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
          setLoadedAtIso(new Date().toISOString());
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
  const health = useMemo(() => computeWorkspaceExecutionHealth(rows), [rows]);

  const ownerBreakdown = useMemo<OwnerRollup[]>(() => {
    const byOwner = new Map<string, OwnerRollup>();
    for (const row of rows) {
      const ownerId = row.ownerId?.trim() || "unassigned";
      const current = byOwner.get(ownerId) ?? {
        ownerId,
        ownerLabel: ownerId === "unassigned" ? "Unassigned" : ownerId,
        overdue: 0,
        atRisk: 0,
        onTrack: 0,
        total: 0,
        totalOpen: 0,
        completionRate: 0,
        responseRate: 0,
        escalationRate: 0,
        reliabilityScore: 0,
        pressureScore: 0,
      };
      current.total += 1;
      if (!isCompletedRow(row)) current.totalOpen += 1;
      if (row.status === "overdue") current.overdue += 1;
      else if (row.status === "at_risk") current.atRisk += 1;
      else current.onTrack += 1;
      byOwner.set(ownerId, current);
    }
    for (const owner of byOwner.values()) {
      const ownerRows = rows.filter((r) => (r.ownerId?.trim() || "unassigned") === owner.ownerId);
      const completed = ownerRows.filter((r) => Boolean(r.completedAt));
      const completedOnTime = completed.filter((r) => {
        if (!r.completedAt) return false;
        return new Date(r.completedAt).getTime() <= new Date(r.deadline).getTime();
      }).length;
      const acknowledgedIn24h = ownerRows.filter((r) => {
        const createdMs = new Date(r.createdAt).getTime();
        const lastActivityMs = new Date(r.lastActivityAt).getTime();
        if (!Number.isFinite(createdMs) || !Number.isFinite(lastActivityMs)) return false;
        return lastActivityMs - createdMs <= 24 * 3600000;
      }).length;
      owner.completionRate = owner.total > 0 ? Math.round((completedOnTime / owner.total) * 100) : 0;
      owner.responseRate = owner.total > 0 ? Math.round((acknowledgedIn24h / owner.total) * 100) : 0;
      owner.escalationRate = owner.total > 0 ? Math.round(((owner.overdue + owner.atRisk) / owner.total) * 100) : 0;
      owner.reliabilityScore = Math.max(
        0,
        Math.round(owner.completionRate * 0.55 + owner.responseRate * 0.25 + (100 - owner.escalationRate) * 0.2)
      );
      owner.pressureScore = owner.overdue * 3 + owner.atRisk * 2 + owner.totalOpen;
    }
    return [...byOwner.values()]
      .map((o) => ({
        ...o,
        ownerLabel: resolveAdministratorLabel(o.ownerId),
      }))
      .sort(
        (a, b) =>
          b.overdue - a.overdue ||
          b.atRisk - a.atRisk ||
          b.pressureScore - a.pressureScore ||
          b.overdue - a.overdue ||
          b.atRisk - a.atRisk ||
          b.totalOpen - a.totalOpen
      );
  }, [rows, resolveAdministratorLabel]);

  const staleRows = useMemo(
    () =>
      openRows
        .filter((r) => staleDays(r.lastActivityAt) >= 3)
        .sort((a, b) => staleDays(b.lastActivityAt) - staleDays(a.lastActivityAt))
        .slice(0, 8),
    [openRows]
  );

  const breakdownPatterns = useMemo<BreakdownPattern[]>(() => {
    const map = new Map<string, number>();
    for (const row of openRows) {
      if (row.status !== "overdue" && row.status !== "at_risk") continue;
      const key = `${row.priority} priority ${row.status === "overdue" ? "misses" : "risk"}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [openRows]);

  const topOverdue = useMemo(
    () =>
      overdueRows
        .slice()
        .sort((a, b) => overdueDays(b.deadline) - overdueDays(a.deadline))
        .slice(0, 10),
    [overdueRows]
  );

  return (
    <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] space-y-[var(--r5-space-5)]">
      <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/60 p-[var(--r5-space-5)]">
        <div className="flex flex-wrap items-start justify-between gap-[var(--r5-space-3)]">
          <div>
            <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">
              Leadership command center
            </p>
            <h1 className="mt-[var(--r5-space-2)] text-[20px] font-semibold tracking-[-0.01em] text-r5-text-primary">
              Execution health
            </h1>
            <p className="mt-[var(--r5-space-2)] max-w-[62ch] text-[13px] text-r5-text-secondary">
              Instant read: what is breaking, who is overloaded, and where intervention is required.
            </p>
          </div>
          <div className="flex items-center gap-[var(--r5-space-2)]">
            <Link
              href="/desk"
              className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/50 px-[var(--r5-space-3)] py-[var(--r5-space-1)] text-[12px] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover"
            >
              Open feed
            </Link>
            <Link
              href="/workspace/escalations"
              className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/50 px-[var(--r5-space-3)] py-[var(--r5-space-1)] text-[12px] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover"
            >
              Escalations
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="mt-[var(--r5-space-3)] h-10 w-28 animate-pulse rounded-[var(--r5-radius-md)] bg-r5-border-subtle/35" />
        ) : (
          <div className="mt-[var(--r5-space-4)] flex flex-wrap items-end justify-between gap-[var(--r5-space-3)]">
            <div className="flex items-end gap-[var(--r5-space-2)]">
              <p className={`text-[length:var(--r5-font-display)] font-semibold leading-none ${scoreTone(health)}`}>{health}</p>
              <p className="pb-[var(--r5-space-1)] text-[length:var(--r5-font-subheading)] text-r5-text-secondary">/ 100</p>
            </div>
            <p className="text-[11px] text-r5-text-secondary">
              {loadedAtIso ? `Updated ${new Date(loadedAtIso).toLocaleTimeString()}` : ""}
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-[var(--r5-space-3)] sm:grid-cols-3">
        <Link
          href={orgCommitmentsHref()}
          className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-4)] transition hover:border-r5-accent/35 hover:bg-r5-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r5-accent"
          aria-label={`On track commitments: ${onTrackCount}`}
        >
          <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">On track</p>
          <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-stat)] font-semibold text-r5-status-completed">{onTrackCount}</p>
          <p className="mt-2 text-[11px] font-medium text-r5-accent">View commitments →</p>
        </Link>
        <Link
          href={orgCommitmentsHref("at_risk")}
          className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-4)] transition hover:border-r5-accent/35 hover:bg-r5-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r5-accent"
          aria-label={`At risk commitments: ${atRiskCount}`}
        >
          <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">At risk</p>
          <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-stat)] font-semibold text-r5-status-at-risk">{atRiskCount}</p>
          <p className="mt-2 text-[11px] font-medium text-r5-accent">View commitments →</p>
        </Link>
        <Link
          href={orgCommitmentsHref("overdue")}
          className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-4)] transition hover:border-r5-accent/35 hover:bg-r5-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r5-accent"
          aria-label={`Overdue commitments: ${overdueRows.length}`}
        >
          <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">Overdue</p>
          <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-stat)] font-semibold text-r5-status-overdue">{overdueRows.length}</p>
          <p className="mt-2 text-[11px] font-medium text-r5-accent">View commitments →</p>
        </Link>
      </section>

      <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
        <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">
          Administrator breakdown
        </h2>
        <div className="mt-[var(--r5-space-3)] overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[length:var(--r5-font-body)]">
            <thead>
              <tr className="border-b border-r5-border-subtle/70 text-r5-text-secondary">
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Administrator</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Overdue</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">At risk</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">On track</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Total</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Open</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Completion %</th>
                <th className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] font-medium">Reliability</th>
              </tr>
            </thead>
            <tbody>
              {ownerBreakdown.map((owner) => (
                <tr key={owner.ownerId} className="border-b border-r5-border-subtle/40 text-r5-text-primary">
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)]">{owner.ownerLabel}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] text-r5-status-overdue">{owner.overdue}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] text-r5-status-at-risk">{owner.atRisk}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)] text-r5-status-completed">{owner.onTrack}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)]">{owner.total}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)]">{owner.totalOpen}</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)]">{owner.completionRate}%</td>
                  <td className="px-[var(--r5-space-2)] py-[var(--r5-space-2)]">{owner.reliabilityScore}</td>
                </tr>
              ))}
              {ownerBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-[var(--r5-space-2)] py-[var(--r5-space-4)] text-r5-text-secondary">No open commitments.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-[var(--r5-space-3)] lg:grid-cols-2">
        <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
          <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">Top overdue commitments</h2>
          {topOverdue.length === 0 ? (
            <p className="mt-[var(--r5-space-3)] text-[length:var(--r5-font-body)] text-r5-text-secondary">No overdue commitments.</p>
          ) : (
            <ul className="mt-[var(--r5-space-3)] space-y-[var(--r5-space-2)]">
              {topOverdue.map((row) => (
                <li key={row.id} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-[var(--r5-space-2)]">
                  <div className="flex items-start justify-between gap-[var(--r5-space-2)]">
                    <div>
                      <p className="text-[length:var(--r5-font-subheading)] text-r5-text-primary">{row.title}</p>
                      <p className="text-[length:var(--r5-font-body)] text-r5-text-secondary">
                        {resolveAdministratorLabel(row.ownerId?.trim() || "unassigned")}
                      </p>
                    </div>
                    <p className="text-[11px] font-medium text-r5-status-overdue">
                      {overdueDays(row.deadline)}d overdue
                    </p>
                  </div>
                  <div className="mt-[var(--r5-space-2)]">
                    <Link
                      href={`/workspace/escalations?commitment_id=${encodeURIComponent(row.id)}`}
                      className="text-[12px] font-medium text-r5-accent hover:underline"
                    >
                      Escalate now
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-[var(--r5-space-3)]">
          <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
            <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">
              Stalled commitments
            </h2>
            {staleRows.length === 0 ? (
              <p className="mt-[var(--r5-space-3)] text-[length:var(--r5-font-body)] text-r5-text-secondary">
                No stalled commitments.
              </p>
            ) : (
              <ul className="mt-[var(--r5-space-3)] space-y-[var(--r5-space-2)]">
                {staleRows.map((row) => (
                  <li key={row.id} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-[var(--r5-space-2)]">
                    <p className="text-[13px] text-r5-text-primary">{row.title}</p>
                    <p className="text-[11px] text-r5-text-secondary">
                      {staleDays(row.lastActivityAt)}d since activity
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
            <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">
              Breakdown patterns
            </h2>
            {breakdownPatterns.length === 0 ? (
              <p className="mt-[var(--r5-space-3)] text-[length:var(--r5-font-body)] text-r5-text-secondary">
                No active risk clusters.
              </p>
            ) : (
              <ul className="mt-[var(--r5-space-3)] space-y-[var(--r5-space-2)]">
                {breakdownPatterns.map((pattern) => (
                  <li key={pattern.label} className="flex items-center justify-between rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-[var(--r5-space-2)]">
                    <p className="text-[13px] text-r5-text-primary">{pattern.label}</p>
                    <span className="text-[11px] font-semibold text-r5-text-secondary">{pattern.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

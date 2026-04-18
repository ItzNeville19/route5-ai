"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, CircleDot, Target, UserX } from "lucide-react";
import type { CommitmentRiskItem, ExecutionOverview } from "@/lib/commitment-types";
import { deskUrl } from "@/lib/desk-routes";

function assigneeLabel(r: CommitmentRiskItem, currentUserId: string | undefined): string {
  const name = r.ownerDisplayName?.trim();
  if (name) return name;
  if (r.ownerUserId) {
    if (currentUserId && r.ownerUserId === currentUserId) return "You";
    return "Assigned teammate";
  }
  return "Unassigned";
}

type Props = {
  overview: ExecutionOverview | null;
  loading: boolean;
};

/**
 * Commitment-based execution intel (same source as Desk /api/workspace/execution).
 * Shows what is tracked, at risk, and unowned — not capture-only metrics.
 */
export default function DashboardCommitmentSnapshot({ overview, loading }: Props) {
  const { user } = useUser();

  if (loading) {
    return (
      <div
        className="dashboard-home-card mb-6 h-[160px] animate-pulse rounded-[24px] px-5 sm:px-6"
        aria-hidden
      />
    );
  }

  if (!overview) {
    return null;
  }

  const { summary, riskFeed } = overview;
  const hasWork = summary.activeTotal > 0 || summary.overdueCount > 0;
  const overdueItems = riskFeed.filter((r) => r.riskReason === "overdue");
  const otherRiskItems = riskFeed.filter((r) => r.riskReason !== "overdue");

  /** Status buckets are mutually exclusive among non-done commitments (see execution-overview). */
  const onTrackCount = Math.max(0, summary.activeTotal - summary.atRiskCount - summary.overdueCount);
  const barDenom = Math.max(1, summary.activeTotal);
  const seg = (n: number) => `${Math.max(0, Math.round((n / barDenom) * 100))}%`;

  return (
    <section
      className="dashboard-home-card mb-6 overflow-hidden rounded-[24px] border border-[var(--workspace-border)] px-5 py-5 sm:px-6 sm:py-6"
      aria-label="Execution tracking"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
            Execution tracking
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
            What we are holding the line on
          </h2>
          <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Counts come from saved commitments (from Desk and from every decision capture). Assign owners on
            Desk; stale items surface as at risk after seven days without an update.
          </p>
        </div>
        <Link
          href={deskUrl()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)]"
        >
          Open Desk
          <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Link>
      </div>

      {/* Open-work status mix (mutually exclusive statuses); unassigned is separate in metrics */}
      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
          <span>Open commitments by status</span>
          <span className="tabular-nums text-[var(--workspace-fg)]/80">
            {summary.pctCompletedThisWeek}% closed this week
          </span>
        </div>
        {summary.activeTotal === 0 ? (
          <div className="h-3 w-full rounded-full bg-[var(--workspace-border)]/40 ring-1 ring-white/5" />
        ) : (
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--workspace-border)]/50 ring-1 ring-white/5">
            <motion.span
              className="shrink-0 bg-sky-500/85"
              title="On track"
              initial={{ width: "0%" }}
              animate={{ width: seg(onTrackCount) }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
            <motion.span
              className="shrink-0 bg-amber-400/90"
              title="At risk"
              initial={{ width: "0%" }}
              animate={{ width: seg(summary.atRiskCount) }}
              transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.03 }}
            />
            <motion.span
              className="shrink-0 bg-red-500/90"
              title="Overdue"
              initial={{ width: "0%" }}
              animate={{ width: seg(summary.overdueCount) }}
              transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.06 }}
            />
          </div>
        )}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--workspace-muted-fg)]">
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />
            On track ({onTrackCount})
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
            At risk ({summary.atRiskCount})
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
            Overdue ({summary.overdueCount})
          </li>
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Target} label="Active" value={summary.activeTotal} warn={false} />
        <Metric icon={AlertTriangle} label="Overdue" value={summary.overdueCount} warn={summary.overdueCount > 0} />
        <Metric icon={CircleDot} label="At risk" value={summary.atRiskCount} warn={summary.atRiskCount > 0} />
        <Metric icon={UserX} label="No owner" value={summary.unassignedCount} warn={summary.unassignedCount > 0} />
      </div>

      {!hasWork ? (
        <p className="mt-4 rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/40 px-4 py-3 text-[13px] text-[var(--workspace-muted-fg)]">
          No open commitments yet. On Desk, paste notes, review proposed commitments, and commit — they show up
          here with owners and due dates.
        </p>
      ) : riskFeed.length > 0 ? (
        <div className="mt-5 space-y-5 border-t border-[var(--workspace-border)]/80 pt-4">
          {overdueItems.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-200/90">
                Overdue — who owns it
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
                {overdueItems.slice(0, 10).map((r, i) => (
                  <RiskRow key={r.id} r={r} i={i} currentUserId={user?.id} />
                ))}
              </ul>
            </div>
          ) : null}
          {otherRiskItems.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
                {overdueItems.length > 0 ? "Also needs attention" : "Needs attention"}
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
                {otherRiskItems.slice(0, 8).map((r, i) => (
                  <RiskRow key={r.id} r={r} i={i} currentUserId={user?.id} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function RiskRow({
  r,
  i,
  currentUserId,
}: {
  r: CommitmentRiskItem;
  i: number;
  currentUserId: string | undefined;
}) {
  const owner = assigneeLabel(r, currentUserId);
  const badge =
    r.riskReason === "overdue"
      ? "Overdue"
      : r.riskReason === "unassigned"
        ? "No owner"
        : "Stalled";

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      <Link
        href={deskUrl({ projectId: r.projectId })}
        className="group flex h-full flex-col rounded-2xl border border-[var(--workspace-border)]/70 bg-[var(--workspace-surface)]/45 p-3 transition hover:border-[var(--workspace-accent)]/45 hover:bg-[var(--workspace-nav-hover)]"
      >
        <span className="min-w-0 font-medium leading-snug text-[var(--workspace-fg)]">{r.title}</span>
        <p className="mt-2 text-[12px] leading-snug text-[var(--workspace-muted-fg)]">
          <span className="font-semibold text-[var(--workspace-fg)]">{owner}</span>
          <span className="text-[var(--workspace-fg)]/50"> · </span>
          {r.projectName}
          {r.dueDate ? (
            <>
              <span className="text-[var(--workspace-fg)]/50"> · </span>
              Due {r.dueDate.slice(0, 10)}
            </>
          ) : null}
        </p>
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--workspace-border)]/80 px-2 py-0.5 text-[11px] text-[var(--workspace-muted-fg)]">
          {badge}
          <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-70" aria-hidden />
        </span>
      </Link>
    </motion.li>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  warn,
}: {
  icon: typeof Target;
  label: string;
  value: number;
  warn: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border px-3 py-3 transition ${
        warn
          ? "border-amber-500/35 bg-amber-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/40"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
        <Icon className="h-3.5 w-3.5 opacity-80" strokeWidth={2} aria-hidden />
        {label}
      </div>
      <p className="mt-1.5 text-[22px] font-semibold tabular-nums text-[var(--workspace-fg)]">{value}</p>
    </motion.div>
  );
}

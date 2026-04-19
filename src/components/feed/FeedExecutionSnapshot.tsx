"use client";

import { CheckCircle2, Flame, Target } from "lucide-react";

type FeedExecutionSnapshotProps = {
  commitmentsCount: number;
  overdueCount: number;
  completedThisWeek: number;
};

/** Feed pulse — three KPI tiles (summary refresh lives on the main Feed “Sync” control). */
export default function FeedExecutionSnapshot({
  commitmentsCount,
  overdueCount,
  completedThisWeek,
}: FeedExecutionSnapshotProps) {
  return (
    <section className="mb-[var(--r5-space-5)]" aria-label="Feed summary">
      <div className="grid grid-cols-1 gap-[var(--r5-space-2)] sm:grid-cols-3 sm:gap-[var(--r5-space-3)]">
        <div className="workspace-preview-panel group flex min-h-[4.5rem] flex-col justify-between px-[var(--r5-space-3)] py-[var(--r5-space-3)] transition-[transform,box-shadow] duration-[var(--r5-duration-normal)] ease-[var(--r5-ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--r5-shadow-elevated)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-[var(--r5-font-weight-semibold)] uppercase tracking-[0.14em] text-r5-text-tertiary">
              Active
            </span>
            <Target
              className="h-4 w-4 text-r5-accent opacity-80 transition group-hover:opacity-100"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
          <p className="text-[length:var(--r5-font-metric)] font-[var(--r5-font-weight-semibold)] tabular-nums leading-none tracking-[-0.04em] text-r5-text-primary">
            {commitmentsCount}
          </p>
        </div>
        <div className="workspace-preview-panel group flex min-h-[4.5rem] flex-col justify-between border-r5-status-overdue/30 bg-r5-status-overdue/[0.08] px-[var(--r5-space-3)] py-[var(--r5-space-3)] transition-[transform,box-shadow] duration-[var(--r5-duration-normal)] ease-[var(--r5-ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--r5-shadow-elevated)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-[var(--r5-font-weight-semibold)] uppercase tracking-[0.14em] text-r5-status-overdue/90">
              Overdue
            </span>
            <Flame
              className="h-4 w-4 text-r5-status-overdue opacity-90 transition group-hover:scale-105"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
          <p className="text-[length:var(--r5-font-metric)] font-[var(--r5-font-weight-semibold)] tabular-nums leading-none tracking-[-0.04em] text-r5-status-overdue">
            {overdueCount}
          </p>
        </div>
        <div className="workspace-preview-panel group flex min-h-[4.5rem] flex-col justify-between border-r5-status-completed/30 bg-r5-status-completed/[0.09] px-[var(--r5-space-3)] py-[var(--r5-space-3)] transition-[transform,box-shadow] duration-[var(--r5-duration-normal)] ease-[var(--r5-ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--r5-shadow-elevated)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-[var(--r5-font-weight-semibold)] uppercase tracking-[0.14em] text-r5-status-completed/90">
              Done this week
            </span>
            <CheckCircle2
              className="h-4 w-4 text-r5-status-completed opacity-90 transition group-hover:scale-105"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
          <p className="text-[length:var(--r5-font-metric)] font-[var(--r5-font-weight-semibold)] tabular-nums leading-none tracking-[-0.04em] text-r5-status-completed">
            {completedThisWeek}
          </p>
        </div>
      </div>
    </section>
  );
}

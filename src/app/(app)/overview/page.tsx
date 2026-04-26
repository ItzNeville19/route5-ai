"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCommitments } from "@/components/commitments/CommitmentsProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

export default function OverviewPage() {
  useWorkspaceData();
  const { metrics, filteredCommitments, loading, error } = useCommitments();

  const teamLoadRows = useMemo(() => metrics.teamLoad.slice(0, 8), [metrics.teamLoad]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,1200px)] space-y-3 pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-r5-border-subtle bg-r5-surface-primary px-4 py-3 shadow-[0_12px_30px_-24px_rgba(14,165,233,0.35)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_65%_at_10%_-20%,rgba(56,189,248,0.16),transparent_60%),radial-gradient(ellipse_70%_55%_at_100%_0%,rgba(99,102,241,0.16),transparent_58%)]"
          aria-hidden
        />
        <p className="relative text-[11px] font-semibold tracking-[0.08em] text-r5-text-secondary">
          Home
        </p>
        <h1 className="relative mt-1 text-[20px] font-semibold tracking-[-0.01em] text-r5-text-primary">
          Execution overview
        </h1>
        <p className="relative mt-1 max-w-[62ch] text-[12px] leading-relaxed text-r5-text-secondary">
          Live visibility into commitments, ownership, and execution risk.
        </p>
        <p className="relative mt-1 text-[11px] text-r5-text-tertiary">
          {filteredCommitments.length} total commitments in current company scope
        </p>
        <div className="relative mt-2.5 flex flex-wrap gap-2">
          <Link
            href="/desk"
            className="inline-flex rounded-full bg-r5-accent px-4 py-2 text-[12px] font-semibold text-white shadow-[0_4px_14px_-12px_rgba(59,130,246,0.65)]"
          >
            Open Desk
          </Link>
          <Link
            href="/workspace/customize"
            className="inline-flex rounded-full border border-r5-border-subtle bg-r5-surface-secondary px-3.5 py-2 text-[12px] font-medium text-r5-text-primary hover:bg-r5-surface-hover"
          >
            Customize
          </Link>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active" value={metrics.active} hint="Not done" />
        <MetricCard label="Overdue" value={metrics.overdue} hint="Past due date" />
        <MetricCard label="At Risk" value={metrics.atRisk} hint="Overdue, stale, or unassigned" />
        <MetricCard label="Unassigned" value={metrics.unassigned} hint="Owner missing" />
      </section>

      <section className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-2.5 shadow-[0_8px_22px_-20px_rgba(14,165,233,0.3)]">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-r5-text-primary">Team load</h2>
        {loading ? (
          <p className="mt-1.5 text-[12px] text-r5-text-secondary">Loading...</p>
        ) : error ? (
          <p className="mt-1.5 text-[12px] text-red-500">{error}</p>
        ) : teamLoadRows.length === 0 ? (
          <div className="mt-1.5 rounded-xl border border-dashed border-r5-border-subtle bg-r5-surface-secondary/55 px-3 py-3 text-center">
            <p className="text-[12px] font-medium text-r5-text-primary">No active commitments yet</p>
          </div>
        ) : (
          <ul className="mt-1.5 divide-y divide-r5-border-subtle">
            {teamLoadRows.map((row) => (
              <li key={row.owner} className="flex items-center justify-between py-1 text-[12px]">
                <span className="text-r5-text-primary">{row.owner}</span>
                <span className="rounded-full border border-r5-border-subtle bg-r5-surface-secondary px-2 py-0.5 text-[11px] font-medium text-r5-text-secondary">
                  {row.activeCount} active
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-r5-border-subtle bg-r5-surface-primary p-2.5 shadow-[0_10px_24px_-22px_rgba(14,165,233,0.4)]">
      <div className="mb-1 h-px w-full bg-gradient-to-r from-sky-400/45 via-indigo-400/35 to-transparent" aria-hidden />
      <p className="text-[11px] font-semibold tracking-[0.03em] text-r5-text-secondary">
        {label}
      </p>
      <p className="mt-0.5 text-[24px] font-bold tracking-[-0.02em] text-r5-text-primary">{value}</p>
      <p className="text-[10px] leading-relaxed text-r5-text-secondary">{hint}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCommitments } from "@/components/commitments/CommitmentsProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

export default function OverviewPage() {
  const { projects } = useWorkspaceData();
  const { metrics, loading, error } = useCommitments();

  const projectCount = projects.length;
  const teamLoadRows = useMemo(() => metrics.teamLoad.slice(0, 8), [metrics.teamLoad]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,1200px)] space-y-5 pb-12">
      <section className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-text-secondary">
          Home
        </p>
        <h1 className="mt-1 text-[24px] font-semibold text-r5-text-primary">
          Commitments operating view
        </h1>
        <p className="mt-1 text-[13px] text-r5-text-secondary">
          Read-only visibility into execution health. Manage tasks in Desk.
        </p>
        <Link
          href="/desk"
          className="mt-3 inline-flex rounded-full bg-r5-accent px-4 py-2 text-[12px] font-semibold text-white"
        >
          Open Desk
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Active" value={metrics.active} hint="Not done" />
        <MetricCard label="Overdue" value={metrics.overdue} hint="Past due date" />
        <MetricCard label="At Risk" value={metrics.atRisk} hint="Overdue, stale, or unassigned" />
        <MetricCard label="Unassigned" value={metrics.unassigned} hint="No owner" />
        <MetricCard label="Companies" value={projectCount} hint="Current workspace" />
      </section>

      <section className="rounded-2xl border border-r5-border-subtle bg-r5-surface-primary p-4">
        <h2 className="text-[15px] font-semibold text-r5-text-primary">Team load</h2>
        {loading ? (
          <p className="mt-2 text-[13px] text-r5-text-secondary">Loading...</p>
        ) : error ? (
          <p className="mt-2 text-[13px] text-red-500">{error}</p>
        ) : teamLoadRows.length === 0 ? (
          <p className="mt-2 text-[13px] text-r5-text-secondary">No active commitments yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-r5-border-subtle">
            {teamLoadRows.map((row) => (
              <li key={row.owner} className="flex items-center justify-between py-2 text-[13px]">
                <span className="text-r5-text-primary">{row.owner}</span>
                <span className="text-r5-text-secondary">{row.activeCount} active</span>
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
    <div className="rounded-xl border border-r5-border-subtle bg-r5-surface-primary p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-r5-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-[28px] font-bold text-r5-text-primary">{value}</p>
      <p className="text-[11px] text-r5-text-secondary">{hint}</p>
    </div>
  );
}

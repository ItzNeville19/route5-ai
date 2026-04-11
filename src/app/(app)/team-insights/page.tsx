import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Team insights — Route5",
  description: "Shared visibility into projects, runs, and connections for your workspace.",
};

export default function TeamInsightsPage() {
  return (
    <div className="mx-auto max-w-[800px] pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Workspace
      </p>
      <div className="mt-3 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--workspace-surface)] shadow-sm ring-1 ring-black/[0.05] dark:ring-white/10">
          <Users className="h-6 w-6 text-[var(--workspace-accent)]" aria-hidden />
        </span>
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
            Team insights
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            A single place to see how the workspace is moving — projects, extractions, and what to do next. This view
            will grow with shared metrics and exports; for now, use Projects and the overview for live counts.
          </p>
        </div>
      </div>

      <div className="dashboard-pro-card mt-10 p-6 sm:p-7">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
          Where to look today
        </h2>
        <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
          <li>
            <Link href="/projects" className="font-semibold text-[var(--workspace-accent)] hover:underline">
              Projects overview
            </Link>{" "}
            — rings and recent runs for your account.
          </li>
          <li>
            <Link href="/integrations" className="font-semibold text-[var(--workspace-accent)] hover:underline">
              Connections
            </Link>{" "}
            — Linear, GitHub, and more as you wire the stack.
          </li>
          <li>
            <Link href="/desk" className="font-semibold text-[var(--workspace-accent)] hover:underline">
              Desk
            </Link>{" "}
            — capture and run extractions before filing into a project.
          </li>
        </ul>
      </div>

      <p className="mt-8 text-[12px] text-[var(--workspace-muted-fg)]">
        Roadmap: shared dashboards for orgs, CSV exports, and pinned team KPIs —{" "}
        <Link href="/docs/roadmap" className="font-medium text-[var(--workspace-accent)] hover:underline">
          Roadmap
        </Link>
        .
      </p>
    </div>
  );
}

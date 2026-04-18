import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import TeamInsightsContent from "@/components/workspace/TeamInsightsContent";

export const metadata: Metadata = {
  title: "Team insights — Route5",
  description: "Shared visibility into projects, commitments, and connectors — same live data as Overview.",
};

export default function TeamInsightsPage() {
  return (
    <div className="mx-auto max-w-[800px] pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Workspace
      </p>
      <div className="mt-3 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--workspace-surface)]/90 shadow-sm ring-1 ring-[var(--workspace-border)]">
          <Users className="h-6 w-6 text-[var(--workspace-accent)]" aria-hidden />
        </span>
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
            Team insights
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Live workspace snapshot — same counts as Overview and Reports. Use exports for standups; connectors below
            reflect what your deployment has wired.
          </p>
        </div>
      </div>

      <TeamInsightsContent />

      <p className="mt-10 text-center text-[12px] text-[var(--workspace-muted-fg)]">
        <Link href="/overview" className="font-medium text-[var(--workspace-accent)] hover:underline">
          ← Overview
        </Link>
      </p>
    </div>
  );
}

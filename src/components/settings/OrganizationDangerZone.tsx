"use client";

import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

/** Company teardown — not wired to Clerk Organizations deletion yet (honest disabled affordance). */
export default function OrganizationDangerZone() {
  const titleId = useId();
  const { orgRole, organizationName } = useWorkspaceData();
  if (orgRole !== "admin") return null;

  return (
    <section
      className="rounded-2xl border border-red-500/35 bg-gradient-to-b from-red-950/[0.12] to-transparent p-5 shadow-[0_0_0_1px_rgba(239,68,68,0.06)]"
      aria-labelledby={titleId}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
            Delete organization
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Removing <span className="font-medium text-[var(--workspace-fg)]">{organizationName ?? "your workspace"}</span>{" "}
            would delete shared projects and commitments for every member. Route5 does not run this action in-app yet —
            use the Organization page to remove teammates first, export anything you need, then contact support if you
            must fully retire the company workspace.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          className="rounded-xl border border-red-500/25 bg-red-950/10 px-4 py-2 text-[13px] font-semibold text-red-200/80 opacity-60"
        >
          Delete organization (unavailable)
        </button>
        <span className="text-[12px] leading-snug text-[var(--workspace-muted-fg)]">
          Clerk-linked teams may also manage organizations from the Clerk dashboard when applicable.
        </span>
      </div>
    </section>
  );
}

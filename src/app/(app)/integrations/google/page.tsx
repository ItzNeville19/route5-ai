"use client";

import Link from "next/link";
import { IconGoogle } from "@/components/marketplace/brand-icons";

export default function GoogleIntegrationPage() {
  return (
    <div className="mx-auto max-w-[800px] pb-24">
      <Link
        href="/integrations"
        className="text-[13px] font-medium text-[var(--workspace-muted-fg)] hover:text-[var(--workspace-fg)]"
      >
        ← Integrations
      </Link>
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--workspace-surface)] shadow-sm ring-1 ring-[var(--workspace-ring-subtle)]">
            <IconGoogle className="h-7 w-7 text-[var(--workspace-fg)]" aria-hidden />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
              Google Workspace
            </h1>
            <p className="mt-1 text-[14px] text-[var(--workspace-muted-fg)]">
              Bring Docs, Calendar context, and Gmail threads into your desk and projects — rolling out in phases.
            </p>
          </div>
        </div>

        <div className="dashboard-pro-card mt-8 p-6 sm:p-7">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
            Today
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
            Paste meeting notes or email excerpts into{" "}
            <Link href="/desk" className="font-semibold text-[var(--workspace-accent)] hover:underline">
              Desk
            </Link>{" "}
            or a project and run extraction — same structured output you already use. Native Google OAuth and file
            pickers are on the roadmap; when live, you&apos;ll connect once under Connections.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/desk"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--workspace-fg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95"
            >
              Open Desk
            </Link>
            <Link
              href="/integrations"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
            >
              All integrations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

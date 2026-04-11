import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { WORKSPACE_APP_TILES } from "@/lib/workspace-apps";

export const metadata: Metadata = {
  title: "Apps — Route5",
  description: "Open any workspace tool from one place — integrations, Desk, and layout.",
};

const groups = ["Work", "Connections", "Workspace"] as const;

export default function WorkspaceAppsPage() {
  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] pb-24">
      <div className="mb-8 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--workspace-accent)]/12 text-[var(--workspace-accent)] ring-1 ring-[var(--workspace-accent)]/20">
            <LayoutGrid className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
              Workspace
            </p>
            <h1 className="mt-1 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
              App launcher
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Everything in one grid — open integrations, Desk, layout, and time settings without hunting the sidebar.
            </p>
          </div>
        </div>
      </div>

      {groups.map((group) => {
        const tiles = WORKSPACE_APP_TILES.filter((t) => t.group === group);
        if (tiles.length === 0) return null;
        return (
          <section key={group} className="mb-10" aria-labelledby={`${group}-heading`}>
            <h2
              id={`${group}-heading`}
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]"
            >
              {group}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((t) => (
                <li key={t.href + t.label}>
                  <Link
                    href={t.href}
                    className="flex h-full flex-col rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 p-4 transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-surface)]"
                  >
                    <span className="text-[15px] font-semibold text-[var(--workspace-fg)]">{t.label}</span>
                    <span className="mt-1.5 text-[12px] leading-snug text-[var(--workspace-muted-fg)]">
                      {t.description}
                    </span>
                    <span className="mt-3 text-[11px] font-medium text-[var(--workspace-accent)]">Open</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="text-center text-[12px] text-[var(--workspace-muted-fg)]">
        <Link href="/projects" className="font-medium text-[var(--workspace-accent)] hover:underline">
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}

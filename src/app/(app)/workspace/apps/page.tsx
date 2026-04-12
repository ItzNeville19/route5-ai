import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { WORKSPACE_APP_TILES } from "@/lib/workspace-apps";

export const metadata: Metadata = {
  title: "Library — Route5",
  description: "Open every major Route5 surface from one clean library.",
};

const groups = ["Work", "Reports", "Connections", "Workspace"] as const;

export default function WorkspaceAppsPage() {
  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] pb-20">
      <div className="dashboard-home-card overflow-hidden rounded-[28px]">
        <div className="border-b border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-5 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start gap-4 sm:gap-5">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--workspace-canvas)]/80 ring-1 ring-[var(--workspace-border)]"
              aria-hidden
            >
              <LayoutGrid className="h-6 w-6 text-[var(--workspace-accent)]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
                Library
              </p>
              <h1 className="mt-1.5 text-[clamp(1.4rem,3.2vw,1.85rem)] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
                Workspace surfaces
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                A simplified map of the main places you can work — same routes as the sidebar.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 px-5 py-8 sm:px-8 sm:py-10">
          {groups.map((group) => {
            const tiles = WORKSPACE_APP_TILES.filter((t) => t.group === group);
            if (tiles.length === 0) return null;
            return (
              <section key={group} className="space-y-4" aria-labelledby={`${group}-heading`}>
                <h2
                  id={`${group}-heading`}
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]"
                >
                  {group}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {tiles.map((t) => (
                    <li key={t.href + t.label}>
                      <Link
                        href={t.href}
                        className="dashboard-home-card flex h-full min-h-[132px] flex-col rounded-xl p-4 transition hover:border-[var(--workspace-accent)]/30"
                      >
                        <span className="text-[15px] font-semibold text-[var(--workspace-fg)]">
                          {t.label}
                        </span>
                        <span className="mt-2 flex-1 text-[13px] leading-snug text-[var(--workspace-muted-fg)]">
                          {t.description}
                        </span>
                        <span className="mt-4 self-start text-[13px] font-medium text-[var(--workspace-accent)]">
                          Open
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <p className="mt-8 text-center text-[12px] text-[var(--workspace-muted-fg)]">
        <Link
          href="/projects"
          className="font-medium text-[var(--workspace-accent)] hover:underline"
        >
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { Project } from "@/lib/types";
import type { RecentExtractionRow } from "@/lib/workspace-summary";
import { formatRelativeLong } from "@/lib/relative-time";

type Props = {
  projects: Project[];
  recent: RecentExtractionRow[];
  loading: boolean;
};

export default function DashboardRecentWork({
  projects,
  recent,
  loading,
}: Props) {
  const { intlLocale } = useI18n();
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="dashboard-home-card rounded-[28px] px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
              Live activity
            </p>
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
              Recent runs
            </h2>
            <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
              Newest extractions from your workspace. All timestamps in your locale.
            </p>
          </div>
          <Link
            href="/desk"
            className="text-[13px] font-medium text-[var(--workspace-accent)] hover:underline"
          >
            Desk
          </Link>
        </div>

        {loading ? (
          <p className="mt-5 text-[14px] text-[var(--workspace-muted-fg)]">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-[var(--workspace-border)] px-4 py-5 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            No runs yet. Capture on Desk or open a project and paste your first thread, note, or
            ticket.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--workspace-border)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
                  <th className="pb-2 pr-3 font-medium">Project</th>
                  <th className="pb-2 pr-3 font-medium">Summary</th>
                  <th className="pb-2 pr-3 font-medium">When</th>
                  <th className="pb-2 pr-3 font-medium">Open actions</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 8).map((item) => {
                  const open = item.openActionsCount ?? 0;
                  const status =
                    open === 0 ? "Closed" : open > 0 ? "Active" : "—";
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--workspace-border)]/60 last:border-0"
                    >
                      <td className="py-3 pr-3 align-top font-medium text-[var(--workspace-fg)]">
                        <Link
                          href={`/projects/${item.projectId}#extractions-section`}
                          className="hover:text-[var(--workspace-accent)]"
                        >
                          {item.projectName}
                        </Link>
                      </td>
                      <td className="max-w-[240px] py-3 pr-3 align-top text-[var(--workspace-muted-fg)]">
                        <Link
                          href={`/projects/${item.projectId}#extractions-section`}
                          className="line-clamp-2 hover:text-[var(--workspace-fg)]"
                        >
                          {item.summarySnippet}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 align-top text-[var(--workspace-muted-fg)]">
                        {formatRelativeLong(item.createdAt, intlLocale)}
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums text-[var(--workspace-fg)]">
                        {open}
                      </td>
                      <td className="py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            status === "Closed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : status === "Active"
                                ? "bg-violet-500/15 text-violet-300"
                                : "bg-[var(--workspace-muted-fg)]/10 text-[var(--workspace-muted-fg)]"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard-home-card rounded-[28px] px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
          Projects
        </p>
        <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
          Recently updated
        </h2>

        {projects.length === 0 ? (
          <p className="mt-5 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            No projects yet. Create one from Overview — every run stays scoped there.
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {recentProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-4 py-3 transition hover:border-[var(--workspace-accent)]/25"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--workspace-canvas)] text-[16px]">
                      {project.iconEmoji?.trim() ? project.iconEmoji.trim() : "•"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-[var(--workspace-fg)]">
                        {project.name}
                      </span>
                      <span className="block text-[12px] text-[var(--workspace-muted-fg)]">
                        Updated {formatRelativeLong(project.updatedAt, intlLocale)}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--workspace-muted-fg)]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

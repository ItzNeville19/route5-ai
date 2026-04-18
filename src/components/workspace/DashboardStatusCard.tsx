"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import type { ProjectHealthRow } from "@/lib/workspace-activity-stats";
import { deskUrl } from "@/lib/desk-routes";
import type { WorkspaceConnectorReadiness } from "@/lib/workspace-summary";

type Props = {
  projectCount: number;
  extractionCount: number;
  readiness: WorkspaceConnectorReadiness | null;
  loading: boolean;
  projectHealth: ProjectHealthRow[];
};

function healthLabel(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 50) return "On track";
  if (score >= 25) return "Needs attention";
  return "Early";
}

export default function DashboardStatusCard({
  projectCount,
  extractionCount,
  readiness,
  loading,
  projectHealth,
}: Props) {
  const top = projectHealth.slice(0, 4);

  return (
    <section
      className="dashboard-home-card relative overflow-hidden rounded-[28px] px-5 py-5 sm:px-6 sm:py-6"
      aria-labelledby="execution-health-heading"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--workspace-accent)]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-[var(--workspace-accent)]/8 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
              Workspace
            </p>
            <h2
              id="execution-health-heading"
              className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[22px]"
            >
              Connectors, runs, and project scores
            </h2>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Live from your workspace. Optional API connectors are configured in{" "}
              <Link href="/settings#connections" className="font-medium text-[var(--workspace-accent)] hover:underline">
                Settings → Connections
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <ConnectorPill label="OpenAI" ok={readiness?.openai ?? false} loading={loading} />
            <ConnectorPill label="Linear" ok={readiness?.linear ?? false} loading={loading} />
            <ConnectorPill label="GitHub" ok={readiness?.github ?? false} loading={loading} />
            <ConnectorPill label="Figma" ok={readiness?.figma ?? false} loading={loading} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 grid gap-3 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/72 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">Workspace</p>
            <p className="mt-2 text-[15px] font-medium text-[var(--workspace-fg)]">
              {loading
                ? "—"
                : `${projectCount} project${projectCount === 1 ? "" : "s"} · ${extractionCount} run${extractionCount === 1 ? "" : "s"}`}
            </p>
            <Link
              href="/overview#new-project"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--workspace-accent)] hover:underline"
            >
              Add project
              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
            </Link>
          </div>
          <div className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/72 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">Desk</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Capture → extract → actions land in projects and feed these scores.
            </p>
            <Link
              href={deskUrl()}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--workspace-accent)] hover:underline"
            >
              Open Desk
              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
            </Link>
          </div>
        </motion.div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
            Project scores
          </p>
          {loading ? (
            <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
          ) : top.length === 0 ? (
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Scores appear after you create projects and runs.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {top.map((p) => (
                <li key={p.projectId}>
                  <Link
                    href={`/projects/${p.projectId}`}
                    aria-label={`${p.projectName}, health score ${p.score} out of 100`}
                    className="block rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2.5 transition hover:border-[var(--workspace-accent)]/25"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[13px] font-medium text-[var(--workspace-fg)]">
                        {p.projectName}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-[var(--workspace-muted-fg)]">{p.openActions} open</span>
                        <span className="rounded-full bg-[var(--workspace-accent)]/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--workspace-accent)]">
                          {p.score} · {healthLabel(p.score)}
                        </span>
                      </span>
                    </div>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--workspace-border)]/70"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-[var(--workspace-accent)]"
                        style={{ width: `${Math.min(100, Math.max(0, p.score))}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
            Quick actions
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/settings"
              className="group rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2.5 text-left transition hover:border-[var(--workspace-accent)]/35"
            >
              <span className="text-[13px] font-medium text-[var(--workspace-fg)]">AI & keys</span>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--workspace-muted-fg)]">
                {readiness?.openai ? "OpenAI path live" : "Configure extraction provider"}
              </p>
            </Link>
            <Link
              href="/integrations/linear"
              className="group rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2.5 text-left transition hover:border-[var(--workspace-accent)]/35"
            >
              <span className="text-[13px] font-medium text-[var(--workspace-fg)]">Linear</span>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--workspace-muted-fg)]">
                {readiness?.linear ? "Connector on" : "Samples & import"}
              </p>
            </Link>
            <Link
              href="/integrations/github"
              className="group rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2.5 text-left transition hover:border-[var(--workspace-accent)]/35"
            >
              <span className="text-[13px] font-medium text-[var(--workspace-fg)]">GitHub</span>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--workspace-muted-fg)]">
                {readiness?.github ? "Connector on" : "Issues & URLs"}
              </p>
            </Link>
            <Link
              href="/integrations/figma"
              className="group rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2.5 text-left transition hover:border-[var(--workspace-accent)]/35"
            >
              <span className="text-[13px] font-medium text-[var(--workspace-fg)]">Figma</span>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--workspace-muted-fg)]">
                {readiness?.figma ? "API import on" : "Token + file link"}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConnectorPill({ label, ok, loading }: { label: string; ok: boolean; loading: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
        loading
          ? "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]"
          : ok
            ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
            : "border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 text-[var(--workspace-muted-fg)]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {label}
      {!loading ? (ok ? " · on" : " · off") : ""}
    </span>
  );
}

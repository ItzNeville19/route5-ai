"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileJson, Users } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import type { WorkspaceConnectorReadiness } from "@/lib/workspace-summary";

type Summary = {
  projectCount: number;
  extractionCount: number;
  readiness?: WorkspaceConnectorReadiness;
};

export default function TeamInsightsContent() {
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/workspace/summary", { credentials: "same-origin" });
      const j = (await res.json().catch(() => ({}))) as Summary;
      if (res.ok) {
        setData({
          projectCount: j.projectCount ?? 0,
          extractionCount: j.extractionCount ?? 0,
          readiness: j.readiness,
        });
        setLoadError(false);
      } else {
        setData(null);
        setLoadError(true);
      }
    } catch {
      setData(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const r = data?.readiness;
  const fullTeam = entitlements?.features.teamInsightsFull ?? false;
  const integrationCount =
    r != null ? [r.openai, r.linear, r.github, r.figma].filter(Boolean).length : null;

  return (
    <>
      {loadError ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-950/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] leading-relaxed text-red-100">
            Couldn&apos;t load workspace counts. Check your connection or try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-2 text-[13px] font-semibold text-red-50 transition hover:bg-red-500/25"
          >
            Retry
          </button>
        </div>
      ) : null}
      {!loadingEntitlements && entitlements && !fullTeam ? (
        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-100">
          <span className="font-semibold text-amber-50">Free snapshot</span> — you see live counts;{" "}
          <Link href="/account/plans" className="font-medium text-violet-300 underline-offset-2 hover:underline">
            Pro
          </Link>{" "}
          adds Slack, full exports, and priority support. Numbers are the same — packaging is what upgrades.
        </div>
      ) : null}
      {!loadingEntitlements && entitlements && fullTeam ? (
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-[13px] leading-relaxed text-emerald-100">
          <span className="font-semibold text-emerald-50">{entitlements.tierLabel}</span> — full team insights
          treatment: exports, connectors, and Slack are included on your plan.
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 transition hover:border-[var(--workspace-accent)]/25"
        >
          <p className="text-[11px] font-medium text-[var(--workspace-muted-fg)]">Projects (workspace)</p>
          <p className="mt-2 text-[28px] font-semibold tabular-nums text-[var(--workspace-fg)]">
            {loading || loadError ? "—" : data?.projectCount ?? "—"}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 transition hover:border-[var(--workspace-accent)]/25"
        >
          <p className="text-[11px] font-medium text-[var(--workspace-muted-fg)]">Extractions (workspace)</p>
          <p className="mt-2 text-[28px] font-semibold tabular-nums text-[var(--workspace-fg)]">
            {loading || loadError ? "—" : data?.extractionCount ?? "—"}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 transition hover:border-[var(--workspace-accent)]/25"
        >
          <p className="text-[11px] font-medium text-[var(--workspace-muted-fg)]">Integrations</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums text-[var(--workspace-fg)]">
            {loadError || loading ? (
              "—"
            ) : integrationCount === null ? (
              "—"
            ) : (
              <>
                {integrationCount}
                <span className="text-[14px] font-medium text-[var(--workspace-muted-fg)]"> / 4</span>
              </>
            )}
          </p>
          <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">OpenAI · Linear · GitHub · Figma</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="workspace-liquid-glass mt-8 overflow-hidden rounded-2xl p-6 sm:p-7"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--workspace-accent)]/12 text-[var(--workspace-accent)]">
            <Users className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">How teams use this today</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-fg)] [opacity:0.9]">
              Project and extraction counts are <span className="font-semibold">per signed-in account</span> (your
              workspace data). Share exports or screens in meetings — real multi-seat org roles and shared tenants are
              on the{" "}
              <Link href="/docs/roadmap" className="font-semibold text-[var(--workspace-accent)] hover:underline">
                roadmap
              </Link>
              . For standups, open{" "}
              <Link href="/reports" className="font-semibold text-[var(--workspace-accent)] hover:underline">
                Reports
              </Link>{" "}
              and export JSON for a portable weekly snapshot.
            </p>
          </div>
        </div>
        <ul className="mt-6 space-y-3 text-[14px] leading-relaxed text-[var(--workspace-fg)] [text-wrap:pretty]">
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
            <span>
              <Link href="/projects" className="font-semibold text-[var(--workspace-accent)] hover:underline">
                Overview
              </Link>{" "}
              — rings, enterprise strip, and charts match these numbers.
            </span>
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
            <span>
              <Link href="/reports" className="font-semibold text-[var(--workspace-accent)] hover:underline">
                Reports
              </Link>{" "}
              — execution analytics +{" "}
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--workspace-accent)]">
                <FileJson className="h-3.5 w-3.5" aria-hidden />
                Export JSON
              </span>{" "}
              for leads.
            </span>
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
            <span>
              <Link href="/integrations" className="font-semibold text-[var(--workspace-accent)] hover:underline">
                Integrations
              </Link>{" "}
              — Linear/GitHub when your deployment has API access configured (see each integration page).
            </span>
          </li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 p-5 sm:p-6"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
          Team alignment
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
          Same numbers everywhere:{" "}
          <Link href="/projects" className="font-semibold text-[var(--workspace-accent)] hover:underline">
            Overview
          </Link>
          , this page, and{" "}
          <Link href="/reports" className="font-semibold text-[var(--workspace-accent)] hover:underline">
            Reports
          </Link>{" "}
          read one workspace snapshot. For execution detail, use{" "}
          <Link href="/desk" className="font-semibold text-[var(--workspace-accent)] hover:underline">
            Desk
          </Link>{" "}
          — then duplicate any run inside a project when you need a clean copy to iterate on.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <span className="font-medium text-[var(--workspace-fg)]">Duplicate a run:</span> open a project →
          extractions → <span className="text-[var(--workspace-fg)]">Duplicate</span> on a card (same project,
          new extraction id).
        </p>
      </motion.div>

      <p className="mt-8 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Multi-seat roles and org-wide dashboards are on the{" "}
        <Link href="/docs/roadmap" className="font-medium text-[var(--workspace-accent)] hover:underline">
          roadmap
        </Link>
        . Today, each signed-in user has their own projects and runs; align in meetings with exports and the same UI
        vocabulary above.
      </p>
    </>
  );
}

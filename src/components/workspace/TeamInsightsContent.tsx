"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, FileJson, Users } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { deskUrl } from "@/lib/desk-routes";
import { deskFilteredHref, orgCommitmentsHref } from "@/lib/workspace/commitment-links";

export default function TeamInsightsContent() {
  const { t } = useI18n();
  const { entitlements, loadingEntitlements, summary, loadingSummary, executionOverview } = useWorkspaceData();
  const r = summary.readiness;
  const fullTeam = entitlements?.features.teamInsightsFull ?? false;
  const integrationCount =
    r != null ? [r.openai, r.linear, r.github, r.figma].filter(Boolean).length : null;
  const staleLoad = useMemo(
    () =>
      (executionOverview?.teamLoad ?? [])
        .slice()
        .sort((a, b) => b.activeCount - a.activeCount)
        .slice(0, 3),
    [executionOverview]
  );

  return (
    <>
      {loadingSummary ? (
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[12px] text-[var(--workspace-muted-fg)]">
          <AlertTriangle className="h-3.5 w-3.5" />
          Updating team execution view...
        </div>
      ) : null}
      {!loadingEntitlements && entitlements && !fullTeam ? (
        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[var(--workspace-fg)]">
          <span className="font-semibold">Free snapshot</span> — you see live counts;{" "}
          <Link href="/account/plans" className="font-medium text-[var(--workspace-accent)] underline-offset-2 hover:underline">
            Pro
          </Link>{" "}
          adds Slack, full exports, and priority support. Numbers are the same — packaging is what upgrades.
        </div>
      ) : null}
      {!loadingEntitlements && entitlements && fullTeam ? (
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-[13px] leading-relaxed text-[var(--workspace-fg)]">
          <span className="font-semibold">{entitlements.tierLabel}</span> — full team insights
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
            {loadingSummary ? "—" : summary.projectCount}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 transition hover:border-[var(--workspace-accent)]/25"
        >
          <p className="text-[11px] font-medium text-[var(--workspace-muted-fg)]">Decisions captured</p>
          <p className="mt-2 text-[28px] font-semibold tabular-nums text-[var(--workspace-fg)]">
            {loadingSummary ? "—" : summary.extractionCount}
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
            {loadingSummary ? (
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

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Link
          href={orgCommitmentsHref()}
          className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-accent)]"
          aria-label={`${t("commitment.metrics.active")}: ${executionOverview?.summary.activeTotal ?? "—"}`}
        >
          <p className="text-[11px] text-[var(--workspace-muted-fg)]">{t("commitment.metrics.active")}</p>
          <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">
            {executionOverview?.summary.activeTotal ?? "—"}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--workspace-accent)]">{t("commitment.openList")}</p>
        </Link>
        <Link
          href={orgCommitmentsHref("at_risk")}
          className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-accent)]"
          aria-label={`${t("commitment.metrics.atRisk")}: ${executionOverview?.summary.atRiskCount ?? "—"}`}
        >
          <p className="text-[11px] text-[var(--workspace-muted-fg)]">{t("commitment.metrics.atRisk")}</p>
          <p className="text-[16px] font-semibold text-[color-mix(in_srgb,#d97706_78%,var(--workspace-fg))]">
            {executionOverview?.summary.atRiskCount ?? "—"}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--workspace-accent)]">{t("commitment.openList")}</p>
        </Link>
        <Link
          href={orgCommitmentsHref("overdue")}
          className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-accent)]"
          aria-label={`${t("commitment.metrics.overdue")}: ${executionOverview?.summary.overdueCount ?? "—"}`}
        >
          <p className="text-[11px] text-[var(--workspace-muted-fg)]">{t("commitment.metrics.overdue")}</p>
          <p className="text-[16px] font-semibold text-[color-mix(in_srgb,var(--workspace-danger-fg)_88%,var(--workspace-fg))]">
            {executionOverview?.summary.overdueCount ?? "—"}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--workspace-accent)]">{t("commitment.openList")}</p>
        </Link>
        <Link
          href={deskFilteredHref("unassigned")}
          className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-accent)]"
          aria-label={`${t("commitment.metrics.unassigned")}: ${executionOverview?.summary.unassignedCount ?? "—"}`}
        >
          <p className="text-[11px] text-[var(--workspace-muted-fg)]">{t("commitment.metrics.unassigned")}</p>
          <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">
            {executionOverview?.summary.unassignedCount ?? "—"}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--workspace-accent)]">{t("commitment.openList")}</p>
        </Link>
      </div>

      <section className="mt-4 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/55 p-4">
        <h2 className="text-[14px] font-semibold text-[var(--workspace-fg)]">Team load snapshot</h2>
        {staleLoad.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">
            Open work by person will show here as tasks are assigned and owned.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {staleLoad.map((owner) => (
              <li
                key={owner.key}
                className="flex items-center justify-between rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/45 px-3 py-2"
              >
                <p className="text-[13px] text-[var(--workspace-fg)]">{owner.label}</p>
                <p className="text-[12px] text-[var(--workspace-muted-fg)]">
                  {owner.activeCount} active {owner.overloaded ? "· overloaded" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

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
              Project and decision counts are <span className="font-semibold">per signed-in account</span>. Share exports
              or screens in meetings for weekly reviews. For standups, open{" "}
              <Link href="/overview" className="font-semibold text-[var(--workspace-accent)] hover:underline">
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
              <Link href="/overview" className="font-semibold text-[var(--workspace-accent)] hover:underline">
                Overview
              </Link>{" "}
              — rings, enterprise strip, and charts match these numbers.
            </span>
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
            <span>
              <Link href="/overview" className="font-semibold text-[var(--workspace-accent)] hover:underline">
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
              <Link href="/settings#connections" className="font-semibold text-[var(--workspace-accent)] hover:underline">
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
          <Link href="/overview" className="font-semibold text-[var(--workspace-accent)] hover:underline">
            Overview
          </Link>
          , this page, and{" "}
          <Link href="/overview" className="font-semibold text-[var(--workspace-accent)] hover:underline">
            Reports
          </Link>{" "}
          read one workspace snapshot. For execution detail, use{" "}
          <Link href={deskUrl()} className="font-semibold text-[var(--workspace-accent)] hover:underline">
            Desk
          </Link>{" "}
          — then duplicate any captured decision inside a project when you need a clean copy to iterate on.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <span className="font-medium text-[var(--workspace-fg)]">Duplicate a commitment:</span> open a project →
          captured decisions → <span className="text-[var(--workspace-fg)]">Duplicate</span> on a card (same project,
          new capture).
        </p>
      </motion.div>

      <p className="mt-8 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Today, each signed-in user has their own projects and commitments; align in meetings with exports and the same UI
        vocabulary above.
      </p>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Crown, Lock } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import {
  formatPlanCap,
  isNearOrOverLimit,
  planUsagePercent,
} from "@/lib/plan-usage-display";
import type { TierFeatures } from "@/lib/entitlements";

type TabId = "usage" | "features";

type FeatureRow = {
  key: keyof TierFeatures;
  label: string;
  href?: string;
  /** Shown when locked on free */
  unlockHint: string;
};

const FEATURE_ROWS: FeatureRow[] = [
  {
    key: "advancedAnalytics",
    label: "Advanced analytics & chart exports",
    href: "/reports",
    unlockHint: "Pro+",
  },
  {
    key: "exportFull",
    label: "Full Reports exports (JSON, print, SVG)",
    href: "/reports",
    unlockHint: "Pro+",
  },
  {
    key: "slackConnector",
    label: "Slack connector & integration depth",
    href: "/integrations/slack",
    unlockHint: "Pro+",
  },
  {
    key: "teamInsightsFull",
    label: "Full Team insights treatment",
    href: "/team-insights",
    unlockHint: "Pro+",
  },
  {
    key: "prioritySupport",
    label: "Priority support & connector betas",
    href: "/contact",
    unlockHint: "Pro+",
  },
];

function UsageBar({
  label,
  used,
  cap,
  suffix,
}: {
  label: string;
  used: number;
  cap: number;
  suffix: string;
}) {
  const pct = planUsagePercent(used, cap);
  const warn = isNearOrOverLimit(used, cap);
  const unlimited = pct === null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-medium text-[var(--workspace-fg)]">{label}</span>
        <span className="tabular-nums text-[var(--workspace-muted-fg)]">
          {used.toLocaleString()}
          {!unlimited ? (
            <>
              {" "}
              / {formatPlanCap(cap)} {suffix}
            </>
          ) : (
            <span className="text-emerald-600/90 dark:text-emerald-400/90"> · Unlimited</span>
          )}
        </span>
      </div>
      {!unlimited ? (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--workspace-border)]"
          role="progressbar"
          aria-valuenow={pct ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              warn ? "bg-amber-500" : "bg-[var(--workspace-accent)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Plan limits, live usage, and feature gates — sits above Marketplace on Overview.
 * Drives upgrades on Free with clear meters + feature checklist.
 */
export default function DashboardPlanUsagePanel() {
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const [tab, setTab] = useState<TabId>("usage");

  const tier = entitlements?.tier ?? "free";
  const paid = entitlements?.isPaidTier ?? false;
  const limits = entitlements?.limits;
  const usage = entitlements?.usage;
  const features = entitlements?.features;

  const upgradeHref = "/account/plans";
  const pricingHref = "/pricing";

  const tabClass = (id: TabId) =>
    `rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
      tab === id
        ? "bg-[var(--workspace-fg)] text-[var(--workspace-canvas)] shadow-sm"
        : "text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]"
    }`;

  const headline = useMemo(() => {
    if (loadingEntitlements) return "Loading plan…";
    return `${entitlements?.tierLabel ?? "Free"} workspace`;
  }, [loadingEntitlements, entitlements?.tierLabel]);

  return (
    <section
      className="dashboard-home-card scroll-mt-24 rounded-[28px] px-5 py-5 sm:px-7 sm:py-6"
      aria-label="Plan usage and features"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
              Plan &amp; capacity
            </p>
            {!loadingEntitlements && paid ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <Crown className="h-3 w-3" strokeWidth={2} aria-hidden />
                Active
              </span>
            ) : !loadingEntitlements ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Free
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-[clamp(1.1rem,2.5vw,1.35rem)] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
            {headline}
          </h2>
          <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            {loadingEntitlements
              ? "Fetching limits and usage…"
              : entitlements?.tierTagline ??
                "Plans set monthly extraction and project ceilings — numbers below match enforcement."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={upgradeHref}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold transition ${
              paid
                ? "border border-[var(--workspace-border)] bg-[var(--workspace-surface)] text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
                : "bg-[var(--workspace-accent)] text-[var(--workspace-on-accent)] shadow-md hover:opacity-95"
            }`}
          >
            {paid ? "Manage plan" : "Upgrade workspace"}
          </Link>
          <Link
            href={pricingHref}
            className="text-center text-[12px] font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline sm:text-right"
          >
            Compare tiers
          </Link>
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 p-1">
        <button type="button" className={tabClass("usage")} onClick={() => setTab("usage")}>
          Usage
        </button>
        <button type="button" className={tabClass("features")} onClick={() => setTab("features")}>
          More features
        </button>
      </div>

      {tab === "usage" ? (
        <div className="mt-5 space-y-5">
          {loadingEntitlements || !limits || !usage ? (
            <p className="text-[14px] text-[var(--workspace-muted-fg)]">Loading usage…</p>
          ) : (
            <>
              <UsageBar
                label="Extractions this month (UTC)"
                used={usage.extractionsThisMonth}
                cap={limits.maxExtractionsPerMonth}
                suffix="runs"
              />
              <UsageBar
                label="Projects"
                used={usage.projectCount}
                cap={limits.maxProjects}
                suffix="workspaces"
              />
              <p className="text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
                Total runs (all time):{" "}
                <span className="font-medium text-[var(--workspace-fg)] tabular-nums">
                  {usage.extractionCount.toLocaleString()}
                </span>
                . Limits match your{" "}
                <span className="font-medium text-[var(--workspace-fg)]">{tier}</span> plan — same
                checks as Desk and project creation.
              </p>
              {!paid && isNearOrOverLimit(usage.extractionsThisMonth, limits.maxExtractionsPerMonth) ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-[13px] leading-relaxed text-amber-950 dark:text-amber-100">
                  You&apos;re close to this month&apos;s extraction cap on Free.{" "}
                  <Link href={upgradeHref} className="font-semibold text-[var(--workspace-accent)] hover:underline">
                    Upgrade
                  </Link>{" "}
                  for higher monthly volume and Pro connectors.
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          <p className="text-[13px] text-[var(--workspace-muted-fg)]">
            What your tier unlocks in-app — upgrade to remove gates.
          </p>
          <ul className="divide-y divide-[var(--workspace-border)] overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40">
            {FEATURE_ROWS.map((row) => {
              const on = features?.[row.key] ?? false;
              return (
                <li key={row.key} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      on
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-[var(--workspace-border)]/60 text-[var(--workspace-muted-fg)]"
                    }`}
                  >
                    {on ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Lock className="h-4 w-4" strokeWidth={2} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[var(--workspace-fg)]">{row.label}</p>
                    {on ? (
                      row.href ? (
                        <Link
                          href={row.href}
                          className="mt-0.5 inline-block text-[12px] font-medium text-[var(--workspace-accent)] hover:underline"
                        >
                          Open
                        </Link>
                      ) : null
                    ) : (
                      <p className="mt-0.5 text-[12px] text-[var(--workspace-muted-fg)]">
                        Included on {row.unlockHint}.{" "}
                        <Link href={upgradeHref} className="font-semibold text-[var(--workspace-accent)] hover:underline">
                          Upgrade
                        </Link>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

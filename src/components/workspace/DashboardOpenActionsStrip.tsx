"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ListTodo } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { deskUrl } from "@/lib/desk-routes";

type Props = {
  loading: boolean;
  extractionCount: number;
  openActionCount: number;
};

/**
 * Open actions strip — same execution loop as Desk: oldest incomplete work first.
 */
export default function DashboardOpenActionsStrip({
  loading,
  extractionCount,
  openActionCount,
}: Props) {
  const { t } = useI18n();

  if (extractionCount === 0 && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div
        className="dashboard-home-card mb-6 h-[72px] animate-pulse rounded-[20px] px-5 sm:px-6"
        aria-hidden
      />
    );
  }

  if (openActionCount > 0) {
    return (
      <div className="mb-6 rounded-[20px] border border-violet-500/25 bg-violet-500/[0.07] px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-[var(--workspace-canvas)]/80 text-violet-300">
            <ListTodo className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200/80">
              {t("overview.openActionsStrip.badge")}
            </p>
            <p className="mt-1 text-[15px] font-semibold leading-snug text-[var(--workspace-fg)]">
              {t("overview.openActionsStrip.title", { count: openActionCount })}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              {t("overview.openActionsStrip.lead")}
            </p>
          </div>
        </div>
        <Link
          href={deskUrl()}
          className="mt-4 inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[var(--workspace-fg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] transition hover:opacity-95 sm:mt-0"
        >
          {t("overview.openActionsStrip.cta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[20px] border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-3.5 text-[14px] text-[var(--workspace-fg)] sm:px-6">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
      <span className="leading-snug">{t("overview.openActionsStrip.caughtUp")}</span>
    </div>
  );
}

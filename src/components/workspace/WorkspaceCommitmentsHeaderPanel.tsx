"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Target,
  X,
} from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { CommitmentRiskItem, ExecutionOverview } from "@/lib/commitment-types";
import { deskHrefWithProjectFilter } from "@/lib/workspace/commitment-links";

function deskFilterForRisk(r: CommitmentRiskItem): "overdue" | "unassigned" | "at_risk" {
  if (r.riskReason === "overdue") return "overdue";
  if (r.riskReason === "unassigned") return "unassigned";
  return "at_risk";
}

export default function WorkspaceCommitmentsHeaderPanel() {
  const { t, intlLocale } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<ExecutionOverview | null>(null);

  const loadExecution = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/execution", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { overview?: ExecutionOverview };
      if (res.ok && data.overview) setOverview(data.overview);
      else setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadExecution();
  }, [open, loadExecution]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const attentionCount = overview?.riskFeed?.length ?? 0;
  const summary = overview?.summary;

  const riskPreview = useMemo(() => overview?.riskFeed.slice(0, 8) ?? [], [overview]);

  const badge =
    summary && summary.overdueCount + summary.atRiskCount + summary.unassignedCount > 0
      ? summary.overdueCount + summary.atRiskCount + summary.unassignedCount
      : attentionCount > 0
        ? attentionCount
        : 0;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex rounded-[var(--r5-radius-pill)] border border-zinc-300/90 bg-white p-[var(--r5-space-2)] text-zinc-800 shadow-[var(--r5-shadow-elevated)] ring-1 ring-black/[0.04] transition-[background-color,color,box-shadow] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-zinc-50 hover:text-zinc-950"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("header.commitments.open")}
      >
        <ClipboardList className="h-4 w-4" strokeWidth={2} aria-hidden />
        {badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-[var(--r5-radius-pill)] bg-red-600 px-[var(--r5-space-1)] text-[length:var(--r5-font-kbd)] font-semibold text-white shadow-sm">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[199] bg-black/35"
                aria-label={t("modal.newProject.close")}
                onClick={() => setOpen(false)}
              />
              <aside
                className="fixed left-3 right-3 top-16 z-[200] flex max-h-[min(85dvh,640px)] w-auto flex-col overflow-hidden rounded-[20px] border border-zinc-200/90 bg-[#f2f2f7] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:left-auto sm:right-4 sm:top-[calc(var(--r5-header-height)+8px)] sm:w-[min(100vw-2rem,420px)] sm:max-h-[min(85dvh,680px)]"
                role="dialog"
                aria-label={t("header.commitments.dialogTitle")}
                aria-modal="true"
              >
                <header className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-200/90 bg-[#f2f2f7]/95 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight text-[#1d1d1f]">
                      {t("header.commitments.dialogTitle")}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#636366]">
                      {t("header.commitments.dialogSubtitle")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-2 text-[#636366] transition hover:bg-black/5 hover:text-[#1d1d1f]"
                    aria-label={t("modal.newProject.close")}
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
                  {loading ? (
                    <div className="flex items-center gap-2 py-10 text-[13px] text-[#636366]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#007aff]" />
                      {t("header.commitments.loading")}
                    </div>
                  ) : !summary ? (
                    <p className="rounded-2xl bg-white px-4 py-6 text-center text-[13px] text-[#636366] shadow-sm ring-1 ring-black/[0.06]">
                      {t("header.commitments.unavailable")}
                    </p>
                  ) : (
                    <>
                      <section className="mb-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06]">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#636366]">
                          {t("header.commitments.snapshot")}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <MetricCell label={t("commitment.metrics.active")} value={summary.activeTotal} tone="neutral" />
                          <MetricCell label={t("commitment.metrics.overdue")} value={summary.overdueCount} tone="danger" />
                          <MetricCell label={t("commitment.metrics.atRisk")} value={summary.atRiskCount} tone="warn" />
                          <MetricCell
                            label={t("commitment.metrics.unassigned")}
                            value={summary.unassignedCount}
                            tone="info"
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                          <Link
                            href="/workspace/commitments"
                            onClick={() => setOpen(false)}
                            className="inline-flex flex-1 min-w-[9rem] items-center justify-center gap-1.5 rounded-xl bg-[#007aff] px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0066d6]"
                          >
                            <Target className="h-4 w-4" aria-hidden />
                            {t("header.commitments.openFullTracker")}
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-90" aria-hidden />
                          </Link>
                          <Link
                            href="/desk"
                            onClick={() => setOpen(false)}
                            className="inline-flex flex-1 min-w-[9rem] items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-zinc-50"
                          >
                            {t("header.commitments.openDesk")}
                          </Link>
                        </div>
                      </section>

                      <section className="mb-3">
                        <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#636366]">
                          {t("header.commitments.needsAttention")}
                        </p>
                        {riskPreview.length === 0 ? (
                          <div className="rounded-2xl bg-white px-4 py-8 text-center shadow-sm ring-1 ring-black/[0.06]">
                            <CheckCircle2 className="mx-auto h-8 w-8 text-[#34c759]" strokeWidth={1.75} />
                            <p className="mt-2 text-[13px] font-medium text-[#1d1d1f]">{t("header.commitments.allClear")}</p>
                            <p className="mt-1 text-[12px] text-[#636366]">{t("header.commitments.allClearHint")}</p>
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {riskPreview.map((r) => {
                              const href = deskHrefWithProjectFilter(r.projectId, deskFilterForRisk(r));
                              const reason =
                                r.riskReason === "overdue"
                                  ? t("commitment.metrics.overdue")
                                  : r.riskReason === "unassigned"
                                    ? t("commitment.metrics.unassigned")
                                    : t("commitment.metrics.atRisk");
                              return (
                                <li key={r.id}>
                                  <Link
                                    href={href}
                                    onClick={() => setOpen(false)}
                                    className="flex items-start gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm transition hover:bg-zinc-50"
                                  >
                                    <span
                                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                        r.riskReason === "overdue"
                                          ? "bg-red-50 text-red-700"
                                          : r.riskReason === "unassigned"
                                            ? "bg-violet-50 text-violet-700"
                                            : "bg-amber-50 text-amber-800"
                                      }`}
                                    >
                                      <AlertTriangle className="h-4 w-4" strokeWidth={2} aria-hidden />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#1d1d1f]">
                                        {r.title}
                                      </span>
                                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#636366]">
                                        <span>{r.projectName}</span>
                                        <span className="font-medium text-[#007aff]">{reason}</span>
                                        {r.dueDate ? (
                                          <span className="inline-flex items-center gap-1 tabular-nums">
                                            <Calendar className="h-3 w-3" aria-hidden />
                                            {new Date(r.dueDate).toLocaleDateString(intlLocale, {
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </span>
                                        ) : null}
                                      </span>
                                    </span>
                                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#c7c7cc]" aria-hidden />
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>

                      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#636366]">
                          {t("header.commitments.more")}
                        </p>
                        <ul className="mt-2 space-y-1">
                          <li>
                            <Link
                              href="/workspace/commitments?status=overdue"
                              onClick={() => setOpen(false)}
                              className="flex items-center justify-between rounded-xl px-2 py-2 text-[13px] font-medium text-[#007aff] hover:bg-zinc-50"
                            >
                              {t("header.commitments.linkOverdue")}
                              <ArrowUpRight className="h-4 w-4 opacity-70" />
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/workspace/commitments?status=at_risk"
                              onClick={() => setOpen(false)}
                              className="flex items-center justify-between rounded-xl px-2 py-2 text-[13px] font-medium text-[#007aff] hover:bg-zinc-50"
                            >
                              {t("header.commitments.linkAtRisk")}
                              <ArrowUpRight className="h-4 w-4 opacity-70" />
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/workspace/chat"
                              onClick={() => setOpen(false)}
                              className="flex items-center justify-between rounded-xl px-2 py-2 text-[13px] font-medium text-[#636366] hover:bg-zinc-50"
                            >
                              {t("header.commitments.linkChat")}
                              <ArrowUpRight className="h-4 w-4 opacity-70" />
                            </Link>
                          </li>
                        </ul>
                      </section>
                    </>
                  )}
                </div>
              </aside>
            </>,
            document.body
          )
        : null}
    </div>
  );
}

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "danger" | "warn" | "info";
}) {
  const box =
    tone === "danger"
      ? "bg-red-50 ring-red-200/80"
      : tone === "warn"
        ? "bg-amber-50 ring-amber-200/80"
        : tone === "info"
          ? "bg-violet-50 ring-violet-200/80"
          : "bg-zinc-50 ring-zinc-200/80";
  const num =
    tone === "danger"
      ? "text-red-800"
      : tone === "warn"
        ? "text-amber-900"
        : tone === "info"
          ? "text-violet-900"
          : "text-zinc-900";
  return (
    <div className={`rounded-xl px-2 py-2 ring-1 ${box}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">{label}</p>
      <p className={`mt-0.5 text-[20px] font-semibold tabular-nums ${num}`}>{value}</p>
    </div>
  );
}

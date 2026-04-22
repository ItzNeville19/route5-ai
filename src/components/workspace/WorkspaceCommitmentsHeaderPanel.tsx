"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Calendar, CheckCircle2, Circle, ListTodo, Loader2, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { CommitmentRiskItem, ExecutionOverview } from "@/lib/commitment-types";
import { deskHrefWithProjectFilter, orgCommitmentsHref } from "@/lib/workspace/commitment-links";

function deskFilterForRisk(r: CommitmentRiskItem): "overdue" | "unassigned" | "at_risk" {
  if (r.riskReason === "overdue") return "overdue";
  if (r.riskReason === "unassigned") return "unassigned";
  return "at_risk";
}

/** iOS Reminders–inspired panel: neutral grays, rounded groups, checklist rows, no “notification” badge. */
export default function WorkspaceCommitmentsHeaderPanel() {
  const { t, intlLocale } = useI18n();
  const pathname = usePathname();
  const onDesk = pathname === "/desk" || pathname?.startsWith("/desk/");
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

  const summary = overview?.summary;
  const riskPreview = useMemo(() => overview?.riskFeed.slice(0, 12) ?? [], [overview]);

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
        <ListTodo className="h-4 w-4" strokeWidth={2} aria-hidden />
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
                className="fixed left-3 right-3 top-16 z-[200] flex max-h-[min(88dvh,720px)] w-auto flex-col overflow-hidden rounded-[14px] border border-black/[0.08] bg-[#f2f2f7] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)] sm:left-auto sm:right-4 sm:top-[calc(var(--r5-header-height)+8px)] sm:w-[min(100vw-2rem,380px)] sm:max-h-[min(88dvh,740px)]"
                role="dialog"
                aria-label={t("header.commitments.dialogTitle")}
                aria-modal="true"
              >
                <header className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-[#f2f2f7]/98 px-3 py-2.5 backdrop-blur-md">
                  <div className="min-w-0 flex-1 text-center">
                    <p className="text-[17px] font-semibold leading-snug tracking-[-0.02em] text-[#000000]">
                      {t("header.commitments.remindersTitle")}
                    </p>
                    <p className="mt-0.5 px-2 text-[11px] leading-snug text-[#8e8e93]">
                      {t("header.commitments.remindersSubtitle")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="absolute right-2 top-2 rounded-full p-2 text-[#8e8e93] transition hover:bg-black/[0.05] hover:text-[#000000]"
                    aria-label={t("modal.newProject.close")}
                  >
                    <X className="h-[18px] w-[18px]" strokeWidth={2.25} />
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#8e8e93]">
                      <Loader2 className="h-5 w-5 animate-spin text-[#007aff]" />
                      {t("header.commitments.loading")}
                    </div>
                  ) : !summary ? (
                    <div className="mx-1 rounded-[12px] bg-white px-4 py-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]">
                      <p className="text-[13px] text-[#8e8e93]">{t("header.commitments.unavailable")}</p>
                    </div>
                  ) : (
                    <>
                      {/* Smart counts — neutral rings (not red notification bubbles) */}
                      <section className="mx-1 mb-2 rounded-[12px] bg-white px-3 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]">
                        <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8e8e93]">
                          {t("header.commitments.countsSection")}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 px-1">
                          <RemindersCountRing
                            value={summary.activeTotal}
                            label={t("commitment.metrics.active")}
                            ring="border-zinc-300/90 text-[#1c1c1e]"
                            href={orgCommitmentsHref()}
                            onNavigate={() => setOpen(false)}
                          />
                          <RemindersCountRing
                            value={summary.overdueCount}
                            label={t("commitment.metrics.overdue")}
                            ring="border-orange-300/90 text-[#c2410c]"
                            href={orgCommitmentsHref("overdue")}
                            onNavigate={() => setOpen(false)}
                          />
                          <RemindersCountRing
                            value={summary.atRiskCount}
                            label={t("commitment.metrics.atRisk")}
                            ring="border-amber-300/90 text-[#a16207]"
                            href={orgCommitmentsHref("at_risk")}
                            onNavigate={() => setOpen(false)}
                          />
                          <RemindersCountRing
                            value={summary.unassignedCount}
                            label={t("commitment.metrics.unassigned")}
                            ring="border-violet-300/90 text-[#5b21b6]"
                            href={orgCommitmentsHref()}
                            onNavigate={() => setOpen(false)}
                          />
                        </div>
                        <div className="mt-3 flex gap-2 border-t border-black/[0.06] pt-3">
                          <Link
                            href="/workspace/commitments"
                            onClick={() => setOpen(false)}
                            className={`flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#007aff] px-3 text-[15px] font-medium text-white transition active:opacity-90 ${onDesk ? "w-full flex-1" : "flex-1"}`}
                          >
                            {t("header.commitments.openFullTracker")}
                          </Link>
                          {!onDesk ? (
                            <Link
                              href="/desk"
                              onClick={() => setOpen(false)}
                              className="flex min-h-[44px] flex-1 items-center justify-center rounded-[10px] bg-[#e5e5ea] px-3 text-[15px] font-semibold text-[#000000] transition hover:bg-[#d1d1d6]"
                            >
                              {t("header.commitments.openDesk")}
                            </Link>
                          ) : null}
                        </div>
                      </section>

                      {/* Checklist-style attention list */}
                      <section className="mx-1 mb-2">
                        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8e8e93]">
                          {t("header.commitments.attentionSection")}
                        </p>
                        {riskPreview.length === 0 ? (
                          <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]">
                            <div className="flex flex-col items-center px-4 py-10 text-center">
                              <CheckCircle2 className="h-9 w-9 text-[#34c759]" strokeWidth={1.5} />
                              <p className="mt-2 text-[15px] font-semibold text-[#000000]">
                                {t("header.commitments.allClear")}
                              </p>
                              <p className="mt-1 max-w-[240px] text-[13px] leading-snug text-[#8e8e93]">
                                {t("header.commitments.allClearHint")}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <ul className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]">
                            {riskPreview.map((r, i) => {
                              const href = deskHrefWithProjectFilter(r.projectId, deskFilterForRisk(r));
                              const reason =
                                r.riskReason === "overdue"
                                  ? t("commitment.metrics.overdue")
                                  : r.riskReason === "unassigned"
                                    ? t("commitment.metrics.unassigned")
                                    : t("commitment.metrics.atRisk");
                              const showDivider = i < riskPreview.length - 1;
                              return (
                                <li key={r.id} className={showDivider ? "border-b border-black/[0.06]" : ""}>
                                  <Link
                                    href={href}
                                    onClick={() => setOpen(false)}
                                    className="flex min-h-[52px] items-start gap-3 px-3 py-2.5 transition hover:bg-[#f9f9f9] active:bg-[#f2f2f7]"
                                  >
                                    <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[#c7c7cc] bg-white">
                                      <Circle className="h-[14px] w-[14px] text-[#c7c7cc]" strokeWidth={2} aria-hidden />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="line-clamp-2 text-[15px] font-normal leading-snug text-[#000000]">
                                        {r.title}
                                      </span>
                                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#8e8e93]">
                                        <span>{r.projectName}</span>
                                        <span className="font-medium text-[#007aff]">{reason}</span>
                                        {r.dueDate ? (
                                          <span className="inline-flex items-center gap-1 tabular-nums">
                                            <Calendar className="h-3 w-3 opacity-70" aria-hidden />
                                            {new Date(r.dueDate).toLocaleDateString(intlLocale, {
                                              weekday: "short",
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

                      <section className="mx-1 overflow-hidden rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]">
                        <p className="border-b border-black/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8e8e93]">
                          {t("header.commitments.more")}
                        </p>
                        <RemindersRowLink
                          href="/workspace/commitments?status=overdue"
                          label={t("header.commitments.linkOverdue")}
                          onNavigate={() => setOpen(false)}
                        />
                        <RemindersRowLink
                          href="/workspace/commitments?status=at_risk"
                          label={t("header.commitments.linkAtRisk")}
                          onNavigate={() => setOpen(false)}
                        />
                        <RemindersRowLink
                          href="/workspace/chat"
                          label={t("header.commitments.linkChat")}
                          accent="muted"
                          onNavigate={() => setOpen(false)}
                          last
                        />
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

function RemindersCountRing({
  value,
  label,
  ring,
  href,
  onNavigate,
}: {
  value: number;
  label: string;
  ring: string;
  href: string;
  onNavigate: () => void;
}) {
  const inner = (
    <>
      <div
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border-[2.5px] bg-[#fafafa] text-[20px] font-semibold tabular-nums transition hover:bg-[#f0f0f0] active:scale-[0.98] ${ring}`}
      >
        {value > 99 ? "99+" : value}
      </div>
      <span className="max-w-[72px] text-center text-[10px] font-medium leading-tight text-[#8e8e93]">{label}</span>
    </>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      <Link
        href={href}
        onClick={onNavigate}
        className="flex flex-col items-center gap-1 rounded-[14px] outline-none ring-[#007aff]/40 transition hover:opacity-95 focus-visible:ring-2"
      >
        {inner}
      </Link>
    </div>
  );
}

function RemindersRowLink({
  href,
  label,
  onNavigate,
  accent = "primary",
  last = false,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
  accent?: "primary" | "muted";
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex min-h-[44px] items-center justify-between px-3 py-2 text-[15px] ${
        accent === "primary" ? "font-normal text-[#007aff]" : "text-[#3a3a3c]"
      } transition hover:bg-[#f9f9f9] active:bg-[#f2f2f7] ${last ? "" : "border-b border-black/[0.06]"}`}
    >
      <span>{label}</span>
      <ArrowUpRight className="h-4 w-4 opacity-50" aria-hidden />
    </Link>
  );
}

"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  ListTodo,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useCommitments } from "@/components/commitments/CommitmentsProvider";
import { isAtRisk, isOverdue, isUnassigned } from "@/lib/commitments/derived-metrics";

function taskDetailHref(id: string): string {
  return `/desk?focus=${encodeURIComponent(id)}`;
}

const META_LINE =
  /^\*?\*?(last\s*updated|updated|risk|notes)\b/i;

/** Prefer a real title line; strip common markdown and metadata that leaked into `title`. */
function cleanTaskTitle(raw: string | undefined | null): string {
  if (!raw?.trim()) return "Untitled";
  const lines = raw
    .split(/\n/)
    .map((l) => l.replace(/\*+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const usable = lines.filter((l) => !META_LINE.test(l) && l.length > 0);
  const t = (usable[0] ?? lines[0] ?? raw).replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 2) return "Untitled";
  return t.length > 200 ? `${t.slice(0, 197)}…` : t;
}

/** iOS Reminders–inspired panel: neutral grays, rounded groups, checklist rows, no “notification” badge. */
export default function WorkspaceCommitmentsHeaderPanel() {
  const { t, intlLocale } = useI18n();
  const pathname = usePathname();
  const onDesk = pathname === "/desk" || pathname?.startsWith("/desk/");
  const [open, setOpen] = useState(false);
  const { filteredCommitments, loading } = useCommitments();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const summary = useMemo(() => {
    const active = filteredCommitments.filter((row) => row.status !== "done");
    const overdue = active.filter((row) => isOverdue(row)).length;
    const unassigned = active.filter((row) => isUnassigned(row)).length;
    const atRisk = active.filter((row) => isAtRisk(row)).length;
    const done = filteredCommitments.filter((row) => row.status === "done").length;
    const total = Math.max(1, filteredCommitments.length);
    return {
      activeTotal: active.length,
      overdueCount: overdue,
      atRiskCount: atRisk,
      unassignedCount: unassigned,
      pctCompletedThisWeek: Math.round((done / total) * 100),
    };
  }, [filteredCommitments]);

  const riskPreview = useMemo(() => {
    const active = filteredCommitments.filter((row) => row.status !== "done");
    const ranked = active
      .filter((row) => isAtRisk(row))
      .map((row) => {
        const reason: "overdue" | "unassigned" | "stalled" = isOverdue(row)
          ? "overdue"
          : isUnassigned(row)
            ? "unassigned"
            : "stalled";
        const urgencyScore = reason === "overdue" ? 100 : reason === "unassigned" ? 80 : 60;
        return { row, reason, urgencyScore };
      })
      .sort((a, b) => {
        if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
        const ad = a.row.dueDate ? new Date(a.row.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.row.dueDate ? new Date(b.row.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    return ranked.slice(0, 12);
  }, [filteredCommitments]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary p-[var(--r5-space-2)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color,box-shadow] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover"
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
                className="fixed inset-0 z-[199] bg-black/40"
                aria-label={t("modal.newProject.close")}
                onClick={() => setOpen(false)}
              />
              <aside
                className="fixed left-3 right-3 top-16 z-[200] flex max-h-[min(88dvh,720px)] w-auto flex-col overflow-hidden rounded-[20px] border border-r5-border-subtle bg-r5-surface-primary shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)] sm:left-auto sm:right-4 sm:top-[calc(var(--r5-header-height)+8px)] sm:w-[min(100vw-2rem,400px)] sm:max-h-[min(88dvh,760px)]"
                data-tasks-panel=""
                role="dialog"
                aria-label={t("header.commitments.dialogTitle")}
                aria-modal="true"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header className="relative flex shrink-0 items-center justify-between gap-1 border-b border-r5-border-subtle bg-r5-surface-primary/95 px-2 py-2 pl-2 pr-1 backdrop-blur-md sm:pl-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-r5-accent transition hover:bg-r5-surface-hover"
                    aria-label={t("header.commitments.addTask")}
                    onClick={() => {
                      setOpen(false);
                      window.dispatchEvent(
                        new CustomEvent("route5:new-project-open", { detail: { mode: "task" } })
                      );
                    }}
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1 px-1 text-center">
                    <p className="text-[17px] font-semibold leading-snug tracking-[-0.02em] text-r5-text-primary">
                      {t("header.commitments.remindersTitle")}
                    </p>
                    <p className="mt-0.5 line-clamp-2 px-1 text-[11px] leading-snug text-r5-text-secondary">
                      {t("header.commitments.remindersSubtitle")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
                    aria-label={t("modal.newProject.close")}
                  >
                    <X className="h-[18px] w-[18px]" strokeWidth={2.25} />
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-r5-text-secondary">
                      <Circle className="h-5 w-5 animate-pulse text-r5-accent" />
                      {t("header.commitments.loading")}
                    </div>
                  ) : filteredCommitments.length === 0 ? (
                    <div className="mx-1 rounded-[12px] bg-r5-surface-secondary px-4 py-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-r5-border-subtle">
                      <p className="text-[13px] text-r5-text-secondary">{t("header.commitments.unavailable")}</p>
                    </div>
                  ) : (
                    <>
                      {/* Apple Reminders–style smart lists (2×2), not notification rings */}
                      <section className="mx-1 mb-2 rounded-[12px] bg-r5-surface-secondary/80 px-2 py-2.5 ring-1 ring-r5-border-subtle">
                        <p className="mb-1.5 px-1.5 text-[12px] font-semibold text-r5-text-primary">
                          {t("header.commitments.countsSection")}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <RemindersSmartTile
                            value={summary.activeTotal}
                            label={t("header.commitments.tileAll")}
                            href="/desk"
                            onNavigate={() => setOpen(false)}
                            tone="blue"
                            icon={ListTodo}
                          />
                          <RemindersSmartTile
                            value={summary.overdueCount}
                            label={t("header.commitments.tileOverdue")}
                            href="/desk"
                            onNavigate={() => setOpen(false)}
                            tone="coral"
                            icon={CalendarClock}
                          />
                          <RemindersSmartTile
                            value={summary.atRiskCount}
                            label={t("header.commitments.tileAtRisk")}
                            href="/desk"
                            onNavigate={() => setOpen(false)}
                            tone="amber"
                            icon={AlertTriangle}
                          />
                          <RemindersSmartTile
                            value={summary.unassignedCount}
                            label={t("header.commitments.tileUnassigned")}
                            href="/desk"
                            onNavigate={() => setOpen(false)}
                            tone="violet"
                            icon={UserRound}
                          />
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5 border-t border-r5-border-subtle pt-2.5">
                          <Link
                            href="/desk"
                            onClick={() => setOpen(false)}
                            className={`flex min-h-[40px] items-center justify-center rounded-xl border border-r5-border-subtle bg-r5-surface-primary text-[16px] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover active:opacity-90 ${onDesk ? "w-full" : "w-full"}`}
                          >
                            {t("header.commitments.openFullTracker")}
                          </Link>
                          {!onDesk ? (
                            <Link
                              href="/desk"
                              onClick={() => setOpen(false)}
                              className="flex min-h-[40px] w-full items-center justify-center rounded-xl text-[16px] font-medium text-r5-accent transition active:opacity-80"
                            >
                              {t("header.commitments.openDesk")}
                            </Link>
                          ) : null}
                        </div>
                      </section>

                      {/* Checklist-style attention list */}
                      <section className="mx-1 mb-2">
                        <p className="mb-1.5 px-2 text-[12px] font-semibold text-r5-text-primary">
                          {t("header.commitments.attentionSection")}
                        </p>
                        {riskPreview.length === 0 ? (
                          <div className="overflow-hidden rounded-[12px] bg-r5-surface-secondary/80 ring-1 ring-r5-border-subtle">
                            <div className="flex flex-col items-center px-4 py-10 text-center">
                              <CheckCircle2 className="h-9 w-9 text-r5-status-completed" strokeWidth={1.5} />
                              <p className="mt-2 text-[15px] font-semibold text-r5-text-primary">
                                {t("header.commitments.allClear")}
                              </p>
                              <p className="mt-1 max-w-[240px] text-[13px] leading-snug text-r5-text-secondary">
                                {t("header.commitments.allClearHint")}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <ul
                            className="overflow-hidden rounded-[12px] bg-r5-surface-secondary/80 ring-1 ring-r5-border-subtle"
                            role="list"
                          >
                            {riskPreview.map((r, i) => {
                              const href = taskDetailHref(r.row.id);
                              const reasonKey =
                                r.reason === "overdue"
                                  ? t("header.commitments.reasonOverdue")
                                  : r.reason === "unassigned"
                                    ? t("header.commitments.reasonUnassigned")
                                    : t("header.commitments.reasonAtRisk");
                              const showDivider = i < riskPreview.length - 1;
                              const title = cleanTaskTitle(r.row.title);
                              const subParts: string[] = [];
                              if (r.row.dueDate) {
                                subParts.push(
                                  new Date(r.row.dueDate).toLocaleDateString(intlLocale, {
                                    month: "short",
                                    day: "numeric",
                                  })
                                );
                              }
                              const ownerLabel = r.row.owner?.trim() || "Unassigned";
                              if (ownerLabel) {
                                subParts.push(ownerLabel);
                              }
                              subParts.push(reasonKey);
                              const subline = subParts.join(" · ");
                              return (
                                <li key={r.row.id} className={showDivider ? "border-b border-r5-border-subtle" : ""}>
                                  <Link
                                    href={href}
                                    onClick={() => setOpen(false)}
                                    className="flex min-h-[48px] items-center gap-2.5 px-2.5 py-2 transition hover:bg-r5-surface-hover active:opacity-90"
                                  >
                                    <span
                                      className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border border-[#c6c6c8] bg-r5-surface-primary"
                                      aria-hidden
                                    >
                                      <Circle
                                        className="h-[14px] w-[14px] text-[#8e8e93]"
                                        strokeWidth={1.75}
                                        aria-hidden
                                      />
                                    </span>
                                    <span className="min-w-0 flex-1 pr-0.5">
                                      <span className="line-clamp-2 text-left text-[16px] font-normal leading-tight text-r5-text-primary">
                                        {title}
                                      </span>
                                      {subline ? (
                                        <span className="mt-0.5 line-clamp-1 text-left text-[12px] leading-tight text-r5-text-secondary">
                                          {subline}
                                        </span>
                                      ) : null}
                                    </span>
                                    <ChevronRight
                                      className="h-[18px] w-[18px] shrink-0 text-[#c6c6c8]"
                                      strokeWidth={2}
                                      aria-hidden
                                    />
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>

                      <section className="mx-1 overflow-hidden rounded-[12px] bg-r5-surface-secondary shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-r5-border-subtle">
                        <p className="border-b border-r5-border-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-r5-text-secondary">
                          {t("header.commitments.more")}
                        </p>
                        <RemindersRowLink
                          href="/desk"
                          label={t("header.commitments.openDesk")}
                          onNavigate={() => setOpen(false)}
                        />
                        <RemindersRowLink
                          href="/overview"
                          label={t("header.commitments.openFullTracker")}
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

const SMART_TILE: Record<
  "blue" | "coral" | "amber" | "violet",
  { well: string; icon: string }
> = {
  blue: { well: "bg-[#007aff]/12 text-[#007aff]", icon: "text-[#007aff]" },
  coral: { well: "bg-[#ff3b30]/10 text-[#ff3b30]", icon: "text-[#ff3b30]" },
  amber: { well: "bg-[#ffcc00]/18 text-[#a05a00]", icon: "text-[#b45309]" },
  violet: { well: "bg-violet-500/12 text-violet-600 dark:text-violet-300", icon: "text-violet-600 dark:text-violet-300" },
};

function RemindersSmartTile({
  value,
  label,
  href,
  onNavigate,
  tone,
  icon: Icon,
}: {
  value: number;
  label: string;
  href: string;
  onNavigate: () => void;
  tone: keyof typeof SMART_TILE;
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
}) {
  const c = SMART_TILE[tone];
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex min-h-[72px] min-w-0 items-stretch overflow-hidden rounded-2xl border border-r5-border-subtle/80 bg-r5-surface-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition hover:bg-r5-surface-hover focus-visible:ring-2 focus-visible:ring-r5-accent/40"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ${c.well}`}
        >
          <Icon className={`h-5 w-5 ${c.icon}`} strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[22px] font-semibold leading-none tabular-nums text-r5-text-primary">
            {value > 999 ? "999+" : value}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-tight text-r5-text-secondary">
            {label}
          </p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 self-center text-[#c6c6c8] opacity-0 transition group-hover:opacity-100"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </Link>
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
        accent === "primary" ? "font-normal text-r5-accent" : "text-r5-text-primary"
      } transition hover:bg-r5-surface-hover active:opacity-90 ${last ? "" : "border-b border-r5-border-subtle"}`}
    >
      <span>{label}</span>
      <ArrowUpRight className="h-4 w-4 opacity-50" aria-hidden />
    </Link>
  );
}

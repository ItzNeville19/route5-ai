"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Bell, Info, Maximize2, Minimize2, X } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useI18n } from "@/components/i18n/I18nProvider";
import { buildDailyDigestListItems } from "@/lib/workspace-daily-digest";
import {
  digestFingerprint,
  isDigestUnread,
  markDigestFingerprintSeen,
} from "@/lib/workspace-digest-read";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

/** Digest from live summary — red dot until viewed; optional full screen. */
export default function WorkspaceNotificationsPopover() {
  const { intlLocale } = useI18n();
  const { prefs } = useWorkspaceExperience();
  const { user } = useUser();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [readEpoch, setReadEpoch] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const { summary, executionOverview, loadingSummary } = useWorkspaceData();

  const fingerprint = useMemo(() => {
    if (!summary) return "0:0:0:";
    const latestId = summary.recent[0]?.id ?? null;
    const ex = executionOverview?.summary;
    return digestFingerprint({
      projectCount: summary.projectCount,
      extractionCount: summary.extractionCount,
      staleOpenActions: summary.execution.staleOpenActions,
      latestExtractionId: latestId,
      commitmentOverdue: ex?.overdueCount,
      commitmentAtRisk: ex?.atRiskCount,
      commitmentUnassigned: ex?.unassignedCount,
    });
  }, [summary, executionOverview]);

  const unread = useMemo(() => {
    if (loadingSummary) return false;
    void readEpoch;
    return isDigestUnread(userId, fingerprint);
  }, [userId, fingerprint, loadingSummary, readEpoch]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (fullscreen) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open && !fullscreen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, fullscreen]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("route5:notifications-open", onOpen);
    return () => window.removeEventListener("route5:notifications-open", onOpen);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const digestItems = useMemo(
    () =>
      buildDailyDigestListItems({
        loadingSummary,
        summary,
        executionOverview,
        intlLocale,
        workspaceTimezone: prefs.workspaceTimezone,
      }),
    [summary, executionOverview, loadingSummary, intlLocale, prefs.workspaceTimezone]
  );

  const hasAlertContent =
    !loadingSummary &&
    summary &&
    (summary.execution.staleOpenActions > 0 ||
      summary.extractionCount > 0 ||
      (executionOverview &&
        (executionOverview.summary.overdueCount > 0 ||
          executionOverview.summary.atRiskCount > 0 ||
          executionOverview.summary.unassignedCount > 0)));

  useEffect(() => {
    if (!open || !userId) return;
    if (fingerprint === "0:0:0:" && loadingSummary) return;
    markDigestFingerprintSeen(userId, fingerprint);
    setReadEpoch((e) => e + 1);
  }, [open, userId, fingerprint, loadingSummary]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setFullscreen(false);
  }

  const panelHeader = (
    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <p className="text-[13px] font-semibold text-[var(--workspace-fg)]">Daily digest</p>
        {hasAlertContent ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-sky-500/35 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300"
            title="Workspace digest"
          >
            <Info className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
            Live
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
          title={fullscreen ? "Exit full screen" : "Full screen"}
          aria-label={fullscreen ? "Exit full screen" : "Open full screen"}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => handleOpenChange(false)}
          className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/10 hover:text-zinc-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const panelBody = (
    <div
      className={`overflow-y-auto px-2 py-2 ${fullscreen ? "min-h-0 flex-1" : "max-h-[min(70vh,420px)]"}`}
    >
      {digestItems.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl px-3 py-2.5 ${
            item.tone === "warn" ? "bg-amber-500/10" : "hover:bg-white/[0.04]"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">{item.title}</p>
          {item.href ? (
            <Link
              href={item.href}
              onClick={() => handleOpenChange(false)}
              className="mt-1 block text-[13px] leading-snug text-zinc-200 transition hover:text-white"
            >
              {item.body}
            </Link>
          ) : (
            <p className="mt-1 text-[13px] leading-snug text-zinc-300">{item.body}</p>
          )}
        </div>
      ))}
      {loadingSummary ? <p className="px-3 py-4 text-[13px] text-zinc-300">Loading summary…</p> : null}
    </div>
  );

  const panelFooter = (
    <div className="border-t border-white/10 px-4 py-3">
      <Link
        href="/overview"
        onClick={() => handleOpenChange(false)}
        className="text-[12px] font-medium text-[var(--workspace-accent)] hover:underline"
      >
        Overview
      </Link>
      <span className="mx-2 text-zinc-500">·</span>
      <Link
        href="/overview"
        onClick={() => handleOpenChange(false)}
        className="text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:underline"
      >
        Analytics
      </Link>
      <span className="mx-2 text-zinc-500">·</span>
      <Link
        href="/account/plans"
        onClick={() => handleOpenChange(false)}
        className="text-[12px] font-medium text-zinc-400 hover:text-zinc-200"
      >
        Plans
      </Link>
    </div>
  );

  const panelContent = (
    <>
      {panelHeader}
      {panelBody}
      {panelFooter}
    </>
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        className="relative inline-flex rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-2 text-[var(--workspace-muted-fg)] shadow-sm transition hover:bg-white/[0.1] hover:text-[var(--workspace-fg)]"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Daily digest and workspace updates"
      >
        <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
        {unread ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(9,9,11,0.95)]"
            title="New updates"
            aria-hidden
          />
        ) : null}
      </button>

      {open && !fullscreen ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(calc(100vw-2rem),380px)] rounded-2xl border border-white/12 bg-zinc-950/90 p-0 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(139,92,246,0.15)_inset] backdrop-blur-2xl"
          role="dialog"
          aria-label="Daily digest"
        >
          {panelContent}
        </div>
      ) : null}

      {open && fullscreen
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex flex-col border border-white/10 bg-zinc-950/98 shadow-2xl backdrop-blur-2xl"
              role="dialog"
              aria-label="Daily digest"
              aria-modal="true"
            >
              {panelContent}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

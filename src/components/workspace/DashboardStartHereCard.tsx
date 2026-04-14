"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deskUrl } from "@/lib/desk-routes";
import { Check, X } from "lucide-react";

function dismissedKey(userId: string | undefined) {
  return `route5:start-here:${userId ?? "anon"}:dismissed`;
}
function stepKey(userId: string | undefined, n: 1 | 2 | 3) {
  return `route5:start-here:${userId ?? "anon"}:hide-step-${n}`;
}

export default function DashboardStartHereCard({
  projectCount,
  extractionCount,
  userId,
}: {
  projectCount: number;
  extractionCount: number;
  userId: string | undefined;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hide1, setHide1] = useState(false);
  const [hide2, setHide2] = useState(false);
  const [hide3, setHide3] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(dismissedKey(userId)) === "1") setDismissed(true);
      if (localStorage.getItem(stepKey(userId, 1)) === "1") setHide1(true);
      if (localStorage.getItem(stepKey(userId, 2)) === "1") setHide2(true);
      if (localStorage.getItem(stepKey(userId, 3)) === "1") setHide3(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [userId]);

  const dismissAll = useCallback(() => {
    try {
      localStorage.setItem(dismissedKey(userId), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, [userId]);

  const hideStep = useCallback(
    (n: 1 | 2 | 3) => {
      try {
        localStorage.setItem(stepKey(userId, n), "1");
      } catch {
        /* ignore */
      }
      if (n === 1) setHide1(true);
      if (n === 2) setHide2(true);
      if (n === 3) setHide3(true);
    },
    [userId]
  );

  const hasProject = projectCount > 0;
  const hasRun = extractionCount > 0;

  if (!hydrated || dismissed) return null;

  const visibleSteps = [!hide1, !hide2, !hide3].filter(Boolean).length;
  if (visibleSteps === 0) return null;

  return (
    <div className="relative mt-6 rounded-2xl border border-[var(--workspace-accent)]/35 bg-black/40 p-4 shadow-[0_0_48px_-20px_rgba(139,92,246,0.35)] backdrop-blur-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-accent-hover)]">
            Where to start
          </p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-zinc-400">
            <strong className="font-semibold text-zinc-200">Projects</strong> hold your work.{" "}
            <strong className="font-semibold text-zinc-200">Desk</strong> turns pasted notes into clear next steps you
            can check off. This page shows <strong className="font-semibold text-zinc-200">real progress</strong> from
            what you saved — not a chat that scrolls away.
          </p>
          <p className="mt-3">
            <Link
              href="/docs/ceo-brief"
              className="text-[12px] font-semibold text-[var(--workspace-accent-hover)] underline-offset-2 hover:underline"
            >
              New here? Read the 2‑minute executive brief →
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={dismissAll}
          className="shrink-0 rounded-lg p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-zinc-200"
          aria-label="Dismiss getting started"
          title="Dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {!hide1 ? (
          <li
            className={`relative rounded-xl border px-3 py-3 sm:min-h-[108px] ${
              hasProject
                ? "border-[#d9f99d]/35 bg-[#d9f99d]/[0.07]"
                : "border-white/12 bg-white/[0.03]"
            }`}
          >
            {hasProject ? (
              <button
                type="button"
                onClick={() => hideStep(1)}
                className="absolute right-2 top-2 rounded-md p-1 text-zinc-300 transition hover:bg-black/30 hover:text-zinc-200"
                aria-label="Hide step 1"
                title="Done — hide"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            ) : null}
            <div className="flex items-center justify-between gap-2 pr-6">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">Step 1</span>
              {hasProject ? (
                <Check className="h-4 w-4 text-[#d9f99d]" strokeWidth={2.5} aria-hidden />
              ) : null}
            </div>
            <p className="mt-2 text-[13px] font-medium leading-snug text-zinc-200">Create a project</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-300">
              Scope an initiative — every run and checklist lives here.
            </p>
            {!hasProject ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
                className="mt-3 text-[12px] font-semibold text-[var(--workspace-accent-hover)] underline-offset-2 hover:underline"
              >
                + New project
              </button>
            ) : (
              <p className="mt-3 text-[11px] font-medium text-[#d9f99d]">Done</p>
            )}
          </li>
        ) : null}

        {!hide2 ? (
          <li
            className={`relative rounded-xl border px-3 py-3 sm:min-h-[108px] ${
              hasRun ? "border-[#d9f99d]/35 bg-[#d9f99d]/[0.07]" : "border-white/12 bg-white/[0.03]"
            }`}
          >
            {hasRun ? (
              <button
                type="button"
                onClick={() => hideStep(2)}
                className="absolute right-2 top-2 rounded-md p-1 text-zinc-300 transition hover:bg-black/30 hover:text-zinc-200"
                aria-label="Hide step 2"
                title="Done — hide"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            ) : null}
            <div className="flex items-center justify-between gap-2 pr-6">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">Step 2</span>
              {hasRun ? <Check className="h-4 w-4 text-[#d9f99d]" strokeWidth={2.5} aria-hidden /> : null}
            </div>
            <p className="mt-2 text-[13px] font-medium leading-snug text-zinc-200">Capture on Desk</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-300">
              Paste notes or tickets, then run one step to get next moves.
            </p>
            {!hasRun ? (
              <Link
                href={deskUrl()}
                className="mt-3 inline-block text-[12px] font-semibold text-[var(--workspace-accent-hover)] underline-offset-2 hover:underline"
              >
                Open Desk →
              </Link>
            ) : (
              <p className="mt-3 text-[11px] font-medium text-[#d9f99d]">Done</p>
            )}
          </li>
        ) : null}

        {!hide3 ? (
          <li className="relative rounded-xl border border-[var(--workspace-accent)]/25 bg-[var(--workspace-accent)]/10 px-3 py-3 sm:min-h-[108px]">
            <button
              type="button"
              onClick={() => hideStep(3)}
              className="absolute right-2 top-2 rounded-md p-1 text-zinc-300 transition hover:bg-black/30 hover:text-zinc-200"
              aria-label="Hide step 3"
              title="Hide"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/90">Step 3</span>
            <p className="mt-2 text-[13px] font-medium leading-snug text-zinc-200">Track execution</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-400">
              Check off actions in a project; charts below reflect what you actually finished.
            </p>
            <Link
              href="/reports"
              className="mt-3 inline-block text-[12px] font-semibold text-[var(--workspace-accent-hover)] underline-offset-2 hover:underline"
            >
              Reports →
            </Link>
          </li>
        ) : null}
      </ol>
    </div>
  );
}

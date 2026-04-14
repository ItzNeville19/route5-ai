"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Check, X } from "lucide-react";

const storageKey = (userId: string) => `route5:dismissGettingStarted:${userId}`;

type Props = {
  projectCount: number;
  extractionCount: number;
  openaiReady: boolean;
  linearReady: boolean;
  githubReady: boolean;
  figmaReady: boolean;
};

/**
 * Real onboarding checklist — progress from workspace state, not fake percentages.
 */
export default function DashboardPurposeCard({
  projectCount,
  extractionCount,
  openaiReady,
  linearReady,
  githubReady,
  figmaReady,
}: Props) {
  const { user, isLoaded } = useUser();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  const steps = [
    { id: "project", label: "Create a program or client project", done: projectCount > 0 },
    { id: "run", label: "Run a Desk pass on real operational text", done: extractionCount > 0 },
    { id: "ai", label: "Enable AI extraction (optional)", done: openaiReady },
    {
      id: "conn",
      label: "Open Linear, GitHub, or Figma hub (optional)",
      done: linearReady || githubReady || figmaReady,
    },
  ] as const;
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      setDismissed(false);
      return;
    }
    try {
      setDismissed(localStorage.getItem(storageKey(user.id)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [isLoaded, user]);

  const dismiss = useCallback(() => {
    if (user?.id) {
      try {
        localStorage.setItem(storageKey(user.id), "1");
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  }, [user]);

  if (!isLoaded || dismissed === null || dismissed) return null;

  return (
    <section
      className="dashboard-home-card relative rounded-[28px] px-5 py-5 sm:px-6 sm:py-6"
      aria-labelledby="getting-started-heading"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]"
        aria-label="Dismiss getting started"
        title="Dismiss"
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Getting started
      </p>
      <h2
        id="getting-started-heading"
        className="mt-2 pr-8 text-[20px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]"
      >
        Commitment operations
      </h2>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--workspace-canvas)]/80">
        <div
          className="h-full rounded-full bg-[var(--workspace-accent)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">
        {doneCount} of {steps.length} complete · {pct}%
      </p>
      <ul className="mt-4 space-y-2.5">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2.5 text-[14px]">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                s.done
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                  : "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]"
              }`}
            >
              {s.done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
            </span>
            <span className={s.done ? "text-[var(--workspace-fg)]" : "text-[var(--workspace-muted-fg)]"}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Route5 stores commitments and named actions from every run — Overview reads your saved data, not a chat.{" "}
        <Link
          href="/docs/product"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          Product scope
        </Link>
      </p>
    </section>
  );
}

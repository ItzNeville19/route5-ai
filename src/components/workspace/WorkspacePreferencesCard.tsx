"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { COMMON_TIMEZONES } from "@/lib/timezone-date";
import { clearDismissedInsights } from "@/lib/dashboard-insights";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

function guessTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export default function WorkspacePreferencesCard() {
  const { user } = useUser();
  const exp = useWorkspaceExperience();
  const [tz, setTz] = useState(exp.prefs.workspaceTimezone ?? guessTz());

  useEffect(() => {
    setTz(exp.prefs.workspaceTimezone ?? guessTz());
  }, [exp.prefs.workspaceTimezone]);

  const applyTz = useCallback(() => {
    exp.setPrefs({ workspaceTimezone: tz });
  }, [exp, tz]);

  return (
    <section
      id="workspace-prefs"
      className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6 shadow-sm"
      aria-labelledby="workspace-prefs-heading"
    >
      <h2
        id="workspace-prefs-heading"
        className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]"
      >
        Time &amp; calendar
      </h2>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Insight order, “What&apos;s next” labels, and daily briefing use your timezone. This section is only
        time-related —         layout and apps are in the{" "}
        <Link href="/workspace/apps" className="font-medium text-[var(--workspace-accent)] hover:underline">
          app launcher
        </Link>{" "}
        and{" "}
        <Link href="/workspace/customize" className="font-medium text-[var(--workspace-accent)] hover:underline">
          dashboard layout
        </Link>{" "}
        pages.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="workspace-tz"
            className="text-[12px] font-medium text-[var(--workspace-fg)]"
          >
            Timezone
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <select
              id="workspace-tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="min-w-[220px] rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
            >
              {COMMON_TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyTz}
              className="rounded-lg bg-[var(--workspace-fg)] px-3 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)] transition hover:opacity-95"
            >
              Apply
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--workspace-muted-fg)]">
            Browser guess: {guessTz()}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/40 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--workspace-border)]"
            checked={exp.prefs.insightsAutoShow !== false}
            onChange={(e) => exp.setPrefs({ insightsAutoShow: e.target.checked })}
          />
          <span>
            <span className="block text-[13px] font-medium text-[var(--workspace-fg)]">
              Auto-show first insight each day
            </span>
            <span className="mt-0.5 block text-[12px] text-[var(--workspace-muted-fg)]">
              When on, the feed opens on card 1 after each calendar day change (in your timezone).
            </span>
          </span>
        </label>

        <div className="border-t border-[var(--workspace-border)] pt-4">
          <button
            type="button"
            onClick={() => {
              clearDismissedInsights();
              window.dispatchEvent(new Event("route5:insights-dismiss-reset"));
            }}
            className="text-[12px] font-medium text-[var(--workspace-accent)] hover:underline"
          >
            Reset dismissed “What&apos;s next” tips
          </button>
          <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
            Clears dismissals on this device so the carousel repopulates immediately.
          </p>
        </div>

        {user?.id ? (
          <p className="text-[11px] text-[var(--workspace-muted-fg)]">
            Signed in — workspace preferences sync across devices via your account.
          </p>
        ) : null}
      </div>
    </section>
  );
}

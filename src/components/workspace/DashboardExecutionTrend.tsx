"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Point = { day: string; count: number };

/** 30-day completion trend from `/api/workspace/execution-trend` — real activity_log data only. */
export default function DashboardExecutionTrend() {
  const [series, setSeries] = useState<Point[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/workspace/execution-trend", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
      .then((data: { series?: Point[] }) => {
        if (!cancelled) setSeries(data.series ?? []);
      })
      .catch(() => {
        if (!cancelled) setErr("Could not load trend.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const max = Math.max(1, ...(series ?? []).map((p) => p.count));

  return (
    <section
      className="dashboard-home-card rounded-[24px] border border-[var(--workspace-border)] px-5 py-5 sm:px-6 sm:py-6"
      aria-label="Execution completion trend"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
            Completions (30 days)
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Daily count of status moves to completed, derived from your saved activity log — not a mock chart.
          </p>
        </div>
      </div>
      {err ? (
        <p className="mt-4 text-[13px] text-red-300/90">{err}</p>
      ) : series === null ? (
        <div className="mt-6 flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--workspace-accent)]" aria-hidden />
        </div>
      ) : (
        <div className="mt-6 flex h-36 items-end gap-0.5 sm:gap-1">
          {series.map((p) => (
            <div
              key={p.day}
              title={`${p.day}: ${p.count}`}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end"
            >
              <div
                className="w-full min-h-[4px] rounded-t-sm bg-gradient-to-t from-violet-600/80 to-cyan-500/70 transition group-hover:opacity-90"
                style={{ height: `${Math.max(6, (p.count / max) * 100)}%` }}
              />
              <span className="mt-1 hidden text-[9px] text-[var(--workspace-muted-fg)] sm:block">
                {p.day.slice(8, 10)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

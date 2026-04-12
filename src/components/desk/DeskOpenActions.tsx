"use client";

import Link from "next/link";
import { useState } from "react";
import { Circle, ExternalLink, Loader2 } from "lucide-react";
import type { OpenActionRef } from "@/lib/workspace-summary";
import { formatRelativeLong } from "@/lib/relative-time";

type Props = {
  items: OpenActionRef[];
  locale: string;
  loadingSummary: boolean;
  onToggleComplete: (ref: OpenActionRef) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export default function DeskOpenActions({
  items,
  locale,
  loadingSummary,
  onToggleComplete,
  t,
}: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function onCheck(ref: OpenActionRef) {
    const k = `${ref.extractionId}:${ref.actionId}`;
    setBusyKey(k);
    try {
      await onToggleComplete(ref);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section
      className="dashboard-home-card rounded-[24px] p-5 sm:p-6"
      aria-labelledby="desk-open-queue-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="desk-open-queue-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]"
          >
            {t("desk.openQueueTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            {t("desk.openQueueLead")}
          </p>
        </div>
      </div>

      {loadingSummary ? (
        <div className="mt-5 flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
          <Loader2 className="h-4 w-4 animate-spin opacity-70" aria-hidden />
          {t("desk.loading")}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-5 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
          {t("desk.openQueueEmpty")}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((ref) => {
            const k = `${ref.extractionId}:${ref.actionId}`;
            const busy = busyKey === k;
            return (
              <li
                key={k}
                className="flex gap-3 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 px-3 py-3 sm:px-4"
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onCheck(ref)}
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 text-[var(--workspace-accent)] transition hover:border-[var(--workspace-accent)]/40 disabled:opacity-50"
                  title={t("desk.openQueueMarkDone")}
                  aria-label={t("desk.openQueueMarkDone")}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Circle className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-snug text-[var(--workspace-fg)]">{ref.text}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--workspace-muted-fg)]">
                    <span className="font-medium text-[var(--workspace-muted-fg)]">
                      {ref.projectName}
                    </span>
                    <span aria-hidden>·</span>
                    <time dateTime={ref.extractionCreatedAt}>
                      {formatRelativeLong(ref.extractionCreatedAt, locale)}
                    </time>
                    <Link
                      href={`/projects/${ref.projectId}#extractions-section`}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--workspace-accent)] hover:underline"
                    >
                      {t("desk.openQueueOpenProject")}
                      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                    </Link>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

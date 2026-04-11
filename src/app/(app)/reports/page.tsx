"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Clock, FolderOpen } from "lucide-react";
import type { RecentExtractionRow } from "@/lib/workspace-summary";

function formatWhen(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ReportsPage() {
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [extractionCount, setExtractionCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentExtractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/summary", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        projectCount?: number;
        extractionCount?: number;
        recent?: RecentExtractionRow[];
      };
      if (res.ok) {
        setProjectCount(data.projectCount ?? 0);
        setExtractionCount(data.extractionCount ?? 0);
        setRecent(data.recent ?? []);
      } else {
        setProjectCount(0);
        setExtractionCount(0);
        setRecent([]);
      }
    } catch {
      setProjectCount(0);
      setExtractionCount(0);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] pb-24">
      <div className="mb-8 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--workspace-accent)]/12 text-[var(--workspace-accent)] ring-1 ring-[var(--workspace-accent)]/20">
          <BarChart3 className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
            Workspace
          </p>
          <h1 className="mt-1 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
            Reports
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Live counts and recent extraction activity. Export a full JSON run from any project page.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--workspace-muted-fg)]">
            <FolderOpen className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
            Projects
          </div>
          <p className="mt-2 text-[28px] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
            {loading ? "—" : projectCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--workspace-muted-fg)]">
            <BarChart3 className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
            Extractions
          </div>
          <p className="mt-2 text-[28px] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
            {loading ? "—" : extractionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 shadow-sm">
          <p className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">Recent runs</p>
          <p className="mt-2 text-[28px] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
            {loading ? "—" : recent.length}
          </p>
          <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">Listed below</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
          Recent extractions
        </h2>
        {loading ? (
          <p className="mt-4 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-5 py-10 text-center text-[13px] text-[var(--workspace-muted-fg)]">
            No runs yet — open{" "}
            <Link href="/desk" className="font-medium text-[var(--workspace-accent)] hover:underline">
              Desk
            </Link>{" "}
            or a{" "}
            <Link href="/projects" className="font-medium text-[var(--workspace-accent)] hover:underline">
              project
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--workspace-border)] overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/projects/${r.projectId}#ex-${r.id}`}
                  className="flex gap-4 px-5 py-4 transition hover:bg-[var(--workspace-canvas)]/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      {r.projectName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-[var(--workspace-fg)]">
                      {r.summarySnippet}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-[var(--workspace-muted-fg)]">
                    <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    {formatWhen(r.createdAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center text-[12px] text-[var(--workspace-muted-fg)]">
        <Link href="/projects" className="font-medium text-[var(--workspace-accent)] hover:underline">
          ← Projects overview
        </Link>
      </p>
    </div>
  );
}

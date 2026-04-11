"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import type { RecentExtractionRow } from "@/lib/workspace-summary";

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function WorkspaceSidebarHistory({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const [recent, setRecent] = useState<RecentExtractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/summary", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { recent?: RecentExtractionRow[] };
      setRecent(res.ok ? (data.recent ?? []).slice(0, 6) : []);
    } catch {
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  if (collapsed) {
    return (
      <div className="mt-3 border-t border-[var(--workspace-border)]/80 pt-3">
        <Link
          href="/projects"
          className="flex w-full items-center justify-center rounded-lg border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/40 px-2 py-2 text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]"
          title="Recent extractions — expand sidebar for list"
        >
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sr-only">History</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-[var(--workspace-border)]/80 pt-3">
      <p className="flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
        <Clock className="h-3 w-3 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
        History
      </p>
      <ul className="mt-2 space-y-1">
        {loading ? (
          <li className="px-2 text-[10px] text-[var(--workspace-muted-fg)]">Loading…</li>
        ) : recent.length === 0 ? (
          <li className="px-2 text-[11px] leading-snug text-[var(--workspace-muted-fg)]">
            No extractions yet — open a project and run one.
          </li>
        ) : (
          recent.map((r) => (
            <li key={r.id}>
              <Link
                href={`/projects/${r.projectId}#ex-${r.id}`}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.06]"
              >
                <span className="shrink-0 pt-0.5 text-[9px] font-medium tabular-nums text-[var(--workspace-muted-fg)]">
                  {formatRelative(r.createdAt)}
                </span>
                <span className="min-w-0 flex-1 line-clamp-2 text-[11px] leading-snug text-[var(--workspace-fg)]">
                  {r.summarySnippet || r.projectName}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

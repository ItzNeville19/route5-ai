"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronRight,
  Clock,
  ExternalLink,
  PanelRightClose,
  Terminal,
} from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import type { RecentExtractionRow } from "@/lib/workspace-summary";

const API_LINKS: { href: string; label: string; hint: string }[] = [
  { href: "/api/health", label: "GET /api/health", hint: "Stack + modes" },
  { href: "/api/workspace/summary", label: "GET /api/workspace/summary", hint: "Counts + recent" },
  { href: "/api/workspace/palette", label: "GET /api/workspace/palette", hint: "Palette index" },
  { href: "/api/projects", label: "GET /api/projects", hint: "Project list" },
];

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

export default function WorkspaceRightPanel() {
  const pathname = usePathname();
  const exp = useWorkspaceExperience();
  const open = exp.prefs.rightPanelOpen === true;
  const tab = exp.prefs.rightPanelTab ?? "activity";
  const [recent, setRecent] = useState<RecentExtractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/summary", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { recent?: RecentExtractionRow[] };
      setRecent(res.ok ? (data.recent ?? []) : []);
    } catch {
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => exp.setPrefs({ rightPanelOpen: true })}
        className="workspace-right-rail-toggle hidden shrink-0 border-l border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-1 py-4 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-surface)] hover:text-[var(--workspace-fg)] md:flex"
        title="Open side panel"
        aria-label="Open activity and API panel"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <aside
      className="workspace-right-rail hidden h-full min-h-0 w-[min(100%,300px)] shrink-0 flex-col border-l border-[var(--workspace-border)] bg-[var(--workspace-sidebar)] backdrop-blur-md md:flex"
      aria-label="Activity and API"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--workspace-border)] px-3 py-2">
        <div className="flex min-w-0 rounded-lg bg-[var(--workspace-canvas)]/80 p-0.5">
          <button
            type="button"
            onClick={() => exp.setPrefs({ rightPanelTab: "activity" })}
            className={`flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold ${
              tab === "activity"
                ? "bg-[var(--workspace-surface)] text-[var(--workspace-fg)] shadow-sm"
                : "text-[var(--workspace-muted-fg)]"
            }`}
          >
            <Activity className="h-3.5 w-3.5" aria-hidden />
            Activity
          </button>
          <button
            type="button"
            onClick={() => exp.setPrefs({ rightPanelTab: "api" })}
            className={`flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold ${
              tab === "api"
                ? "bg-[var(--workspace-surface)] text-[var(--workspace-fg)] shadow-sm"
                : "text-[var(--workspace-muted-fg)]"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" aria-hidden />
            API
          </button>
        </div>
        <button
          type="button"
          onClick={() => exp.setPrefs({ rightPanelOpen: false })}
          className="rounded-md p-1.5 text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]"
          title="Collapse panel"
          aria-label="Collapse side panel"
        >
          <PanelRightClose className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {tab === "activity" ? (
          <>
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
              Recent extractions
            </p>
            {loading ? (
              <p className="mt-3 px-1 text-[12px] text-[var(--workspace-muted-fg)]">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-[var(--workspace-border)] px-3 py-4 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
                No runs yet. Use{" "}
                <Link href="/desk" className="font-medium text-[var(--workspace-accent)] hover:underline">
                  Desk
                </Link>{" "}
                or a project to extract.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {recent.slice(0, 12).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/projects/${r.projectId}#ex-${r.id}`}
                      className="block rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2.5 text-left shadow-sm transition hover:border-[var(--workspace-accent)]/25"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                        {r.projectName}
                      </p>
                      <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-[var(--workspace-fg)]">
                        {r.summarySnippet}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--workspace-muted-fg)]">
                        <Clock className="h-3 w-3 opacity-70" aria-hidden />
                        {formatRelative(r.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
              Read-only JSON
            </p>
            <p className="mt-1 px-1 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Same routes the workspace uses. Opens in a new tab.
            </p>
            <ul className="mt-3 space-y-1.5">
              {API_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-[12px] transition hover:border-[var(--workspace-border)] hover:bg-[var(--workspace-canvas)]/80"
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-[11px] font-medium text-[var(--workspace-fg)]">
                        {l.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-[var(--workspace-muted-fg)]">
                        {l.hint}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <Link
              href="/docs/product"
              className="mt-4 block px-1 text-[11px] font-medium text-[var(--workspace-accent)] hover:underline"
            >
              Product scope →
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}

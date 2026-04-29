"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, ShieldAlert } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

type TimelineItem =
  | {
      kind: "notification";
      id: string;
      at: string;
      title: string;
      body: string;
    }
  | {
      kind: "escalation";
      id: string;
      at: string;
      title: string;
      subtitle: string;
      severity: string;
    };

export default function ExecutionActivityLog() {
  const { activeProjectId } = useWorkspaceData();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const escSuffix = activeProjectId
          ? `&projectId=${encodeURIComponent(activeProjectId)}`
          : "";
        const [nRes, eRes] = await Promise.all([
          fetch("/api/notifications?limit=40", { credentials: "same-origin" }),
          fetch(`/api/escalations?resolved=all&limit=35${escSuffix}`, { credentials: "same-origin" }),
        ]);
        const nJson = (await nRes.json().catch(() => ({}))) as {
          notifications?: Array<{ id: string; title: string; body: string; createdAt: string }>;
        };
        const eJson = (await eRes.json().catch(() => ({}))) as {
          escalations?: Array<{
            id: string;
            triggeredAt: string;
            commitmentTitle: string;
            ownerDisplayName: string;
            severity: string;
          }>;
        };
        const merged: TimelineItem[] = [];
        if (nRes.ok && nJson.notifications) {
          for (const n of nJson.notifications) {
            merged.push({
              kind: "notification",
              id: n.id,
              at: n.createdAt,
              title: n.title,
              body: n.body ?? "",
            });
          }
        }
        if (eRes.ok && eJson.escalations) {
          for (const e of eJson.escalations) {
            merged.push({
              kind: "escalation",
              id: e.id,
              at: e.triggeredAt,
              title: e.commitmentTitle,
              subtitle: `${e.ownerDisplayName} · ${e.severity}`,
              severity: e.severity,
            });
          }
        }
        merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        if (!cancelled) setItems(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const grouped = useMemo(() => items.slice(0, 80), [items]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--workspace-accent)_35%,transparent)] border-t-[var(--workspace-accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-6 pb-10 animate-[route5-page-enter_0.35s_ease-out_both]">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-accent)]">Operations</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--workspace-fg)]">Activity & history</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--workspace-muted-fg)]">
          Your alerts and any escalations, newest first — a single feed so you can review what Route5 surfaced for your team.
        </p>
      </header>

      <ul className="space-y-2">
        {grouped.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-6 py-14 text-center text-sm text-[var(--workspace-muted-fg)]">
            No activity recorded yet.
          </li>
        ) : (
          grouped.map((row) => (
            <li
              key={`${row.kind}-${row.id}`}
              className="flex gap-3 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3 backdrop-blur-sm"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-accent)_14%,transparent)]">
                {row.kind === "notification" ? (
                  <Bell className="h-4 w-4 text-[var(--workspace-accent)]" strokeWidth={2} aria-hidden />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-[var(--workspace-danger-fg)]" strokeWidth={2} aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--workspace-fg)]">{row.title}</p>
                  <time className="text-[11px] tabular-nums text-[var(--workspace-muted-fg)]" dateTime={row.at}>
                    {new Date(row.at).toLocaleString()}
                  </time>
                </div>
                {row.kind === "notification" ? (
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                    {row.body}
                  </p>
                ) : (
                  <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">{row.subtitle}</p>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

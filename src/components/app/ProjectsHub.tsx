"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { isCompletedRow } from "@/lib/feed/group-commitments";

type ProjectRollup = {
  commitmentCount: number;
  overdue: number;
  atRisk: number;
  onTrack: number;
  lastUpdated: string | null;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "No activity";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "No activity";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectsHub() {
  const { projects, loadingProjects } = useWorkspaceData();
  const [commitments, setCommitments] = useState<OrgCommitmentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/commitments?sort=updated_at&order=desc", {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as { commitments?: OrgCommitmentRow[] };
        if (!cancelled && res.ok) setCommitments(data.commitments ?? []);
      } catch {
        if (!cancelled) setCommitments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rollupByProject = useMemo(() => {
    const map = new Map<string, ProjectRollup>();
    for (const row of commitments) {
      const pid = row.projectId;
      if (!pid) continue;
      const current = map.get(pid) ?? {
        commitmentCount: 0,
        overdue: 0,
        atRisk: 0,
        onTrack: 0,
        lastUpdated: null,
      };
      current.commitmentCount += 1;
      if (!isCompletedRow(row)) {
        if (row.status === "overdue") current.overdue += 1;
        else if (row.status === "at_risk") current.atRisk += 1;
        else current.onTrack += 1;
      }
      if (!current.lastUpdated || new Date(row.updatedAt).getTime() > new Date(current.lastUpdated).getTime()) {
        current.lastUpdated = row.updatedAt;
      }
      map.set(pid, current);
    }
    return map;
  }, [commitments]);

  if (loadingProjects) {
    return (
      <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded-[var(--r5-radius-card)] bg-r5-border-subtle/35" />
        <div className="mt-[var(--r5-space-6)] space-y-[var(--r5-space-3)]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[var(--r5-radius-lg)] bg-r5-border-subtle/20" />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]">
        <h1 className="text-[length:var(--r5-font-heading)] font-semibold tracking-tight text-r5-text-primary">Projects</h1>
        <p className="mt-[var(--r5-space-2)] max-w-md text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">
          No projects yet — create one to organize commitments.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
          className="mt-[var(--r5-space-6)] inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-space-2)] rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-5)] text-[length:var(--r5-font-subheading)] font-semibold text-r5-surface-primary transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          New project
        </button>
      </div>
    );
  }

  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-6)] sm:px-[var(--r5-content-padding-x)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--r5-space-4)]">
        <div>
          <h1 className="text-[length:var(--r5-font-heading)] font-semibold tracking-tight text-r5-text-primary">Projects</h1>
          <p className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-subheading)] text-r5-text-secondary">
            {sorted.length} project{sorted.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
          className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-space-2)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/80 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-text-primary transition hover:bg-r5-surface-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          New project
        </button>
      </div>

      <ul className="mt-[var(--r5-space-6)] space-y-[var(--r5-space-2)]">
        {sorted.map((project) => {
          const rollup = rollupByProject.get(project.id) ?? {
            commitmentCount: 0,
            overdue: 0,
            atRisk: 0,
            onTrack: 0,
            lastUpdated: null,
          };

          return (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="grid grid-cols-[minmax(0,1.7fr)_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(120px,1fr)] items-center gap-[var(--r5-space-3)] rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/80 bg-r5-surface-secondary/35 px-[var(--r5-space-4)] py-[var(--r5-space-3)] transition hover:border-r5-border-subtle hover:bg-r5-surface-hover"
              >
                <span className="min-w-0 flex items-center gap-[var(--r5-space-2)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r5-radius-md)] bg-r5-surface-primary/60 text-[18px]" aria-hidden>
                    {project.iconEmoji?.trim() ? project.iconEmoji.trim() : <FolderOpen className="h-5 w-5 text-r5-text-secondary" />}
                  </span>
                  <span className="truncate text-[length:var(--r5-font-subheading)] font-medium text-r5-text-primary">{project.name}</span>
                </span>

                <span className="text-[length:var(--r5-font-body)] text-r5-text-secondary">{rollup.commitmentCount} commitments</span>

                <span className="flex flex-wrap items-center gap-[var(--r5-space-2)] text-[length:var(--r5-font-body)]">
                  <span className="text-r5-status-overdue">{rollup.overdue} overdue</span>
                  <span className="text-r5-text-tertiary">·</span>
                  <span className="text-r5-status-at-risk">{rollup.atRisk} at risk</span>
                  <span className="text-r5-text-tertiary">·</span>
                  <span className="text-r5-status-completed">{rollup.onTrack} on track</span>
                </span>

                <span className="text-right text-[length:var(--r5-font-body)] text-r5-text-secondary">{fmtDate(rollup.lastUpdated)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

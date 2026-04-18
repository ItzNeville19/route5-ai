"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Commitment } from "@/lib/commitment-types";
import type { Project } from "@/lib/types";

type Props = { projectId: string };

type ProjectDetailResponse = {
  project?: Project;
};

type ProjectCommitmentsResponse = {
  commitments?: Commitment[];
};

function ownerLabel(c: Commitment): string {
  return c.ownerDisplayName?.trim() || c.ownerUserId?.trim() || "Unassigned";
}

function dueLabel(iso: string | null): string {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "No deadline";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusTone(status: Commitment["status"]): string {
  if (status === "overdue") return "text-r5-status-overdue";
  if (status === "at_risk") return "text-r5-status-at-risk";
  if (status === "completed") return "text-r5-text-tertiary";
  return "text-r5-status-completed";
}

export default function ProjectDashboard({ projectId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [projRes, commitmentsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`, { credentials: "same-origin" }),
          fetch(`/api/projects/${projectId}/commitments?filter=all`, { credentials: "same-origin" }),
        ]);

        const projData = (await projRes.json().catch(() => ({}))) as ProjectDetailResponse;
        const commitmentsData = (await commitmentsRes.json().catch(() => ({}))) as ProjectCommitmentsResponse;

        if (!cancelled) {
          if (projRes.ok && projData.project) {
            setProject(projData.project);
          } else {
            setProject(null);
          }
          setCommitments(commitmentsData.commitments ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const sorted = useMemo(
    () =>
      [...commitments].sort(
        (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
      ),
    [commitments]
  );

  const summary = useMemo(() => {
    let overdue = 0;
    let atRisk = 0;
    let onTrack = 0;
    for (const c of commitments) {
      if (c.status === "completed") continue;
      if (c.status === "overdue") overdue += 1;
      else if (c.status === "at_risk") atRisk += 1;
      else onTrack += 1;
    }
    return { overdue, atRisk, onTrack };
  }, [commitments]);

  if (loading) {
    return (
      <div className="space-y-[var(--r5-space-3)]">
        <div className="h-8 w-56 animate-pulse rounded-[var(--r5-radius-card)] bg-r5-border-subtle/35" />
        <div className="h-14 animate-pulse rounded-[var(--r5-radius-lg)] bg-r5-border-subtle/20" />
        <div className="h-14 animate-pulse rounded-[var(--r5-radius-lg)] bg-r5-border-subtle/20" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-5)] text-center">
        <p className="text-[length:var(--r5-font-subheading)] text-r5-text-secondary">Project not found.</p>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="mt-[var(--r5-space-4)] inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--r5-space-5)]">
      <header className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)]">
        <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">Project</p>
        <h1 className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">{project.name}</h1>
        <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-body)] text-r5-text-secondary">
          {commitments.length} commitments · <span className="text-r5-status-overdue">{summary.overdue} overdue</span> · <span className="text-r5-status-at-risk">{summary.atRisk} at risk</span> · <span className="text-r5-status-completed">{summary.onTrack} on track</span>
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-5)] text-[length:var(--r5-font-subheading)] text-r5-text-secondary">
          No commitments in this project yet.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/60 bg-r5-surface-primary/20">
          {sorted.map((row) => (
            <li key={row.id} className="border-b border-r5-border-subtle/40 px-[var(--r5-space-4)] py-[var(--r5-space-3)] last:border-b-0">
              <div className="flex items-start justify-between gap-[var(--r5-space-3)]">
                <div className="min-w-0">
                  <p className="truncate text-[length:var(--r5-font-subheading)] text-r5-text-primary">{row.title}</p>
                  <p className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-body)] text-r5-text-secondary">
                    {ownerLabel(row)} · {dueLabel(row.dueDate)}
                  </p>
                </div>
                <span className={`shrink-0 text-[length:var(--r5-font-body)] capitalize ${statusTone(row.status)}`}>
                  {row.status.replace("_", " ")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link href="/projects" className="inline-flex text-[length:var(--r5-font-body)] text-r5-text-secondary hover:text-r5-text-primary">
        Back to projects
      </Link>
    </div>
  );
}

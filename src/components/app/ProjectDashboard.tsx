"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Commitment } from "@/lib/commitment-types";
import type { Project } from "@/lib/types";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";

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

type GroupKey = "overdue" | "at_risk" | "on_track" | "completed";
type ProjectTab = "overview" | "commitments" | "activity" | "members" | "chat";
const GROUP_ORDER: GroupKey[] = ["overdue", "at_risk", "on_track", "completed"];
const GROUP_LABEL: Record<GroupKey, string> = {
  overdue: "OVERDUE",
  at_risk: "AT RISK",
  on_track: "ON TRACK",
  completed: "COMPLETED",
};

function toGroup(status: Commitment["status"]): GroupKey {
  if (status === "overdue") return "overdue";
  if (status === "at_risk") return "at_risk";
  if (status === "completed") return "completed";
  return "on_track";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}h ago`;
  return `${Math.max(1, Math.floor(diff / 86_400_000))}d ago`;
}

export default function ProjectDashboard({ projectId }: Props) {
  const router = useRouter();
  const { displayName } = useMemberDirectory();
  const [project, setProject] = useState<Project | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProjectTab>("overview");

  useEffect(() => {
    let cancelled = false;
    const fetchOpts: RequestInit = { credentials: "same-origin", cache: "no-store" };
    const notFoundRetryDelayMs = 600;
    const notFoundMaxRetries = 6;

    async function loadDetail(attempt: number): Promise<void> {
      setLoading(true);
      try {
        const [projRes, commitmentsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`, fetchOpts),
          fetch(`/api/projects/${projectId}/commitments`, fetchOpts),
        ]);

        const projData = (await projRes.json().catch(() => ({}))) as ProjectDetailResponse;
        const commitmentsData = (await commitmentsRes.json().catch(() => ({}))) as ProjectCommitmentsResponse;

        if (cancelled) return;

        if (projRes.ok && projData.project) {
          setProject(projData.project);
          setCommitments(commitmentsData.commitments ?? []);
          return;
        }

        if (projRes.status === 404 && attempt < notFoundMaxRetries) {
          await new Promise((r) => window.setTimeout(r, notFoundRetryDelayMs));
          if (!cancelled) return loadDetail(attempt + 1);
          return;
        }

        setProject(null);
        setCommitments(commitmentsData.commitments ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetail(0);

    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

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

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, Commitment[]>();
    for (const key of GROUP_ORDER) map.set(key, []);
    for (const row of sorted) {
      const bucket = toGroup(row.status);
      const list = map.get(bucket);
      if (list) list.push(row);
    }
    return map;
  }, [sorted]);

  const activityRows = useMemo(() => sorted.slice(0, 10), [sorted]);

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
      <nav className="flex flex-wrap gap-2 rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/70 bg-r5-surface-secondary/25 p-2">
        {(
          [
            ["overview", "Overview"],
            ["commitments", "Commitments"],
            ["activity", "Activity"],
            ["members", "Members"],
            ["chat", "Chat"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`min-h-10 rounded-lg px-3 text-[13px] font-medium transition ${
              tab === value
                ? "bg-r5-surface-hover text-r5-text-primary"
                : "text-r5-text-secondary hover:bg-r5-surface-hover/60 hover:text-r5-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <header className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)]">
        <p className="text-[length:var(--r5-font-caption)] uppercase tracking-[0.14em] text-r5-text-secondary">Project</p>
        <h1 className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">{project.name}</h1>
        <p className="mt-[var(--r5-space-2)] text-[length:var(--r5-font-body)] text-r5-text-secondary">
          {commitments.length} commitments · <span className="text-r5-status-overdue">{summary.overdue} overdue</span> · <span className="text-r5-status-at-risk">{summary.atRisk} at risk</span> · <span className="text-r5-status-completed">{summary.onTrack} on track</span>
        </p>
        {project.memberUserIds && project.memberUserIds.length > 0 ? (
          <div className="mt-[var(--r5-space-3)] flex flex-wrap items-center gap-2">
            {project.memberUserIds.slice(0, 8).map((memberId) => {
              const label = displayName(memberId, undefined, "You");
              return (
                <span
                  key={`${project.id}-${memberId}`}
                  className="inline-flex min-h-8 items-center rounded-full border border-r5-border-subtle bg-r5-surface-primary/70 px-3 text-[12px] text-r5-text-secondary"
                >
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="mt-[var(--r5-space-3)]">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("route5:capture-open"))}
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-text-primary transition hover:bg-r5-surface-hover"
          >
            Add commitment
          </button>
        </div>
      </header>

      {tab === "members" ? (
        <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/20 p-[var(--r5-space-4)]">
          <h2 className="text-[14px] font-semibold text-r5-text-primary">Assigned members</h2>
          <p className="mt-[var(--r5-space-2)] text-[12px] leading-relaxed text-r5-text-secondary">
            Invite people under{" "}
            <Link href="/workspace/organization" className="font-medium text-r5-text-primary underline-offset-2 hover:underline">
              Organization
            </Link>{" "}
            first. After they accept, add them when you create a project (Team members) or include them on the next project you create.
          </p>
          {project.memberUserIds && project.memberUserIds.length > 0 ? (
            <ul className="mt-[var(--r5-space-3)] space-y-2">
              {project.memberUserIds.map((memberId) => (
                <li
                  key={memberId}
                  className="rounded-lg border border-r5-border-subtle/60 bg-r5-surface-primary/50 px-3 py-2 text-[13px] text-r5-text-secondary"
                >
                  {displayName(memberId, undefined, "You")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-[var(--r5-space-3)] text-[13px] text-r5-text-secondary">
              No members assigned yet.
            </p>
          )}
        </section>
      ) : null}

      {tab === "chat" ? (
        <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/20 p-[var(--r5-space-4)]">
          <h2 className="text-[14px] font-semibold text-r5-text-primary">Stay aligned</h2>
          <p className="mt-[var(--r5-space-2)] text-[13px] text-r5-text-secondary">
            Your daily digest and escalation queue summarize what changed — better for async execution than juggling
            another inbox. Prefer live chat? Open workspace chat when you need it.
          </p>
          <div className="mt-[var(--r5-space-3)] flex flex-wrap gap-2">
            <Link
              href="/workspace/digest"
              className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-text-primary transition hover:bg-r5-surface-hover"
            >
              Open daily digest
            </Link>
            <Link
              href="/workspace/chat"
              className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-dashed border-r5-border-subtle bg-transparent px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
            >
              Workspace chat
            </Link>
          </div>
        </section>
      ) : null}

      {(tab === "overview" || tab === "commitments") && (sorted.length === 0 ? (
        <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-5)] text-[length:var(--r5-font-subheading)] text-r5-text-secondary">
          No commitments in this project yet.
        </div>
      ) : (
        <div className="space-y-[var(--r5-space-3)]">
          {GROUP_ORDER.map((group) => {
            const rows = grouped.get(group) ?? [];
            if (rows.length === 0) return null;
            return (
              <section
                key={group}
                className="overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/60 bg-r5-surface-primary/20"
              >
                <header className="flex items-center justify-between border-b border-r5-border-subtle/50 px-[var(--r5-space-4)] py-[var(--r5-space-2)]">
                  <p className={`text-[11px] font-semibold tracking-[0.14em] ${group === "overdue" ? "text-r5-status-overdue" : group === "at_risk" ? "text-r5-status-at-risk" : "text-r5-text-secondary"}`}>
                    {GROUP_LABEL[group]}
                  </p>
                  <span className="text-[11px] text-r5-text-tertiary">{rows.length}</span>
                </header>
                <ul>
                  {rows.map((row) => (
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
              </section>
            );
          })}
        </div>
      ))}

      {(tab === "overview" || tab === "activity") && activityRows.length > 0 ? (
        <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/20 p-[var(--r5-space-4)]">
          <h2 className="text-[14px] font-semibold text-r5-text-primary">Project activity</h2>
          <ul className="mt-[var(--r5-space-2)] space-y-[var(--r5-space-2)]">
            {activityRows.map((row) => (
              <li key={`activity-${row.id}`} className="text-[12px] text-r5-text-secondary">
                <span className="text-r5-text-primary">{row.title}</span> updated {timeAgo(row.lastUpdatedAt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href="/projects" className="inline-flex text-[length:var(--r5-font-body)] text-r5-text-secondary hover:text-r5-text-primary">
        Back to projects
      </Link>
    </div>
  );
}

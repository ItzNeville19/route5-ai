"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { canCreateCompany } from "@/lib/workspace-role";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { isCompletedRow } from "@/lib/feed/group-commitments";

type ProjectRollup = {
  commitmentCount: number;
  overdue: number;
  atRisk: number;
  onTrack: number;
  lastUpdated: string | null;
};

type ProjectCard = {
  id: string;
  name: string;
  iconEmoji: string | null | undefined;
  memberUserIds: string[];
  rollup: ProjectRollup;
  health: number;
  pressure: number;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "No activity";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "No activity";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function projectHealth(rollup: ProjectRollup): number {
  const open = rollup.overdue + rollup.atRisk + rollup.onTrack;
  if (open <= 0) return 100;
  const weighted = rollup.overdue * 16 + rollup.atRisk * 9 + rollup.onTrack * 2;
  const score = 100 - Math.round(weighted / Math.max(open, 1));
  return Math.max(0, Math.min(100, score));
}

function healthToneClass(score: number): string {
  if (score < 60) return "text-r5-status-overdue";
  if (score < 80) return "text-r5-status-at-risk";
  return "text-r5-status-completed";
}

export default function ProjectsHub() {
  const { t } = useI18n();
  const { projects, loadingProjects, orgRole, loadingOrganization } = useWorkspaceData();
  const canAddCompany = !loadingOrganization && canCreateCompany(orgRole);
  const { displayName, get } = useMemberDirectory();
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

  const projectCards = useMemo<ProjectCard[]>(
    () =>
      [...projects]
        .map((project) => {
          const rollup = rollupByProject.get(project.id) ?? {
            commitmentCount: 0,
            overdue: 0,
            atRisk: 0,
            onTrack: 0,
            lastUpdated: null,
          };
          const health = projectHealth(rollup);
          const pressure = rollup.overdue * 3 + rollup.atRisk * 2 + rollup.onTrack;
          return {
            id: project.id,
            name: project.name,
            iconEmoji: project.iconEmoji,
            memberUserIds: project.memberUserIds ?? [],
            rollup,
            health,
            pressure,
          };
        })
        .sort((a, b) => a.health - b.health || b.pressure - a.pressure || a.name.localeCompare(b.name)),
    [projects, rollupByProject]
  );

  const needsAttention = useMemo(
    () => projectCards.filter((p) => p.rollup.overdue > 0 || p.rollup.atRisk > 0).slice(0, 4),
    [projectCards]
  );

  if (loadingProjects) {
    return (
      <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-7)] sm:px-[var(--r5-content-padding-x)] sm:py-[var(--r5-space-6)]" aria-busy="true">
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
      <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-7)] sm:px-[var(--r5-content-padding-x)] sm:py-[var(--r5-space-6)]">
        <h1 className="text-[length:var(--r5-font-heading)] font-semibold tracking-tight text-r5-text-primary">Projects</h1>
        <p className="mt-[var(--r5-space-2)] max-w-md text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">
          {canAddCompany ? t("projects.hub.empty.leadership") : t("projects.hub.empty.member")}
        </p>
        {canAddCompany ? (
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("route5:new-project-open", { detail: { mode: "company" } })
              )
            }
            className="mt-[var(--r5-space-6)] inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-space-2)] rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-5)] text-[length:var(--r5-font-subheading)] font-semibold text-r5-surface-primary transition hover:opacity-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            {t("projects.hub.addCompany")}
          </button>
        ) : (
          <p className="mt-[var(--r5-space-4)] max-w-md text-[length:var(--r5-font-body)] text-r5-text-tertiary">
            {t("projects.hub.addDisabledHint")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-7)] sm:px-[var(--r5-content-padding-x)] sm:py-[var(--r5-space-6)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--r5-space-4)]">
        <div>
          <h1 className="text-[length:var(--r5-font-heading)] font-semibold tracking-tight text-r5-text-primary">Projects</h1>
          <p className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-subheading)] text-r5-text-secondary">
            {projectCards.length} project{projectCards.length === 1 ? "" : "s"}
          </p>
        </div>
        {canAddCompany ? (
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("route5:new-project-open", { detail: { mode: "company" } })
              )
            }
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-space-2)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/80 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-text-primary transition hover:bg-r5-surface-hover"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            {t("projects.hub.addCompany")}
          </button>
        ) : null}
      </div>

      {needsAttention.length > 0 ? (
        <section className="mt-[var(--r5-space-4)] rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
          <h2 className="text-[15px] font-semibold text-r5-text-primary">Needs attention</h2>
          <div className="mt-[var(--r5-space-3)] grid gap-[var(--r5-space-2)] sm:grid-cols-2">
            {needsAttention.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/80 bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-[var(--r5-space-2)] transition hover:bg-r5-surface-hover"
              >
                <p title={project.name} className="break-words text-[13px] font-medium text-r5-text-primary">
                  {project.name}
                </p>
                <p className="mt-[var(--r5-space-1)] text-[11px] text-r5-text-secondary">
                  {project.rollup.overdue} overdue · {project.rollup.atRisk} at risk · project health{" "}
                  <span className={healthToneClass(project.health)}>{project.health}%</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <ul className="mt-[var(--r5-space-6)] space-y-[var(--r5-space-2)]">
        {projectCards.map((project) => {
          const rollup = project.rollup;

          return (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="grid grid-cols-1 gap-[var(--r5-space-2)] rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/80 bg-r5-surface-secondary/35 px-[var(--r5-space-4)] py-[var(--r5-space-3)] transition hover:border-r5-border-subtle hover:bg-r5-surface-hover sm:grid-cols-[minmax(0,1.7fr)_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(130px,1fr)_minmax(88px,0.7fr)_minmax(120px,1fr)] sm:items-center sm:gap-[var(--r5-space-3)]"
              >
                <span className="min-w-0 flex items-center gap-[var(--r5-space-2)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r5-radius-md)] bg-r5-surface-primary/60 text-[18px]" aria-hidden>
                    {project.iconEmoji?.trim() ? project.iconEmoji.trim() : <FolderOpen className="h-5 w-5 text-r5-text-secondary" />}
                  </span>
                  <span title={project.name} className="break-words text-[length:var(--r5-font-subheading)] font-medium text-r5-text-primary">
                    {project.name}
                  </span>
                </span>

                <span className="text-[length:var(--r5-font-body)] text-r5-text-secondary">{rollup.commitmentCount} commitments</span>

                <span className="flex flex-wrap items-center gap-[var(--r5-space-2)] text-[length:var(--r5-font-body)]">
                  <span className="text-r5-status-overdue">{rollup.overdue} overdue</span>
                  <span className="text-r5-text-tertiary">·</span>
                  <span className="text-r5-status-at-risk">{rollup.atRisk} at risk</span>
                  <span className="text-r5-text-tertiary">·</span>
                  <span className="text-r5-status-completed">{rollup.onTrack} on track</span>
                </span>

                <span className="text-[length:var(--r5-font-body)] text-r5-text-secondary sm:text-right">{fmtDate(rollup.lastUpdated)}</span>
                <span className="flex items-center justify-start gap-1 sm:justify-end">
                  {project.memberUserIds.slice(0, 3).map((memberId) => {
                    const label = displayName(memberId, undefined, "You");
                    const profile = get(memberId);
                    const initials = label
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("");
                    return (
                      <span
                        key={`${project.id}-${memberId}`}
                        title={label}
                        className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-r5-border-subtle bg-r5-surface-primary/70 text-[10px] font-semibold text-r5-text-secondary"
                      >
                        {profile?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profile.imageUrl} alt={label} className="h-full w-full object-cover" />
                        ) : (
                          initials || "•"
                        )}
                      </span>
                    );
                  })}
                </span>
                <span className={`text-[12px] font-semibold sm:text-right ${healthToneClass(project.health)}`}>Project health {project.health}%</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

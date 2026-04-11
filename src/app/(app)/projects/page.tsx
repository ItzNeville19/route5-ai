"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, Clock, FolderOpen } from "lucide-react";
import DashboardInsightFeed from "@/components/workspace/DashboardInsightFeed";
import DashboardDailyBriefing from "@/components/workspace/DashboardDailyBriefing";
import DashboardWorkspaceHero from "@/components/workspace/DashboardWorkspaceHero";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { isOnboardingComplete } from "@/lib/onboarding-storage";
import { EXTRACTION_PRESETS } from "@/lib/extraction-presets";
import type { Project } from "@/lib/types";
import type { RecentExtractionRow } from "@/lib/workspace-summary";

function isProjectNew(iso: string, days = 7): boolean {
  const t = new Date(iso).getTime();
  return Date.now() - t < days * 86400000;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const exp = useWorkspaceExperience();
  const { pushToast } = exp;
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);
  const [extractionCount, setExtractionCount] = useState(0);
  const [recent, setRecent] = useState<RecentExtractionRow[]>([]);
  const [readiness, setReadiness] = useState<{
    openai: boolean;
    linear: boolean;
    github: boolean;
  } | null>(null);
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);

  const displayName =
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";
  const onboardingComplete = useMemo(
    () => Boolean(user?.id && isOnboardingComplete(user.id)),
    [user?.id]
  );

  const liveConnectorCount = readiness
    ? Number(readiness.openai) + Number(readiness.linear) + Number(readiness.github)
    : null;
  async function openTemplate(presetId: string) {
    setTemplateLoading(presetId);
    setError(null);
    try {
      let pid = projects[0]?.id;
      if (!pid) {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            name: `Workspace — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          project?: Project;
        };
        if (!res.ok || !data.project?.id) {
          setError(data.error ?? "Could not create a project for this template.");
          pushToast("Could not create a project — try the form below.", "error");
          return;
        }
        pid = data.project.id;
        await load();
        await loadSummary();
      }
      router.push(`/projects/${pid}?preset=${presetId}`);
      pushToast("Opening composer with your template…", "success");
    } finally {
      setTemplateLoading(null);
    }
  }

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/workspace/summary", {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        projectCount?: number;
        extractionCount?: number;
        recent?: RecentExtractionRow[];
        readiness?: { openai?: boolean; linear?: boolean; github?: boolean };
      };
      if (res.ok) {
        setProjectCount(data.projectCount ?? 0);
        setExtractionCount(data.extractionCount ?? 0);
        setRecent(data.recent ?? []);
        const r = data.readiness;
        if (r) {
          setReadiness({
            openai: Boolean(r.openai),
            linear: Boolean(r.linear),
            github: Boolean(r.github),
          });
        } else {
          setReadiness(null);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        projects?: Project[];
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load projects.");
        setProjects([]);
        return;
      }
      setProjects(data.projects ?? []);
    } catch {
      setError("Could not load projects.");
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadSummary();
  }, [load, loadSummary]);

  useEffect(() => {
    const focusNameOnHash = () => {
      if (window.location.hash === "#new-project") {
        document.getElementById("new-project-name")?.focus();
      }
    };
    focusNameOnHash();
    window.addEventListener("hashchange", focusNameOnHash);
    return () => window.removeEventListener("hashchange", focusNameOnHash);
  }, []);

  async function createProject(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        project?: Project;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create project.");
        return;
      }
      setNewName("");
      await load();
      await loadSummary();
      if (data.project?.id) {
        router.push(`/projects/${data.project.id}`);
      }
    } catch {
      setError("Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createProject(name);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;
    void createProject(name);
  }

  return (
    <div className="pb-24">
      {error ? (
        <div
          className="mb-8 rounded-2xl border border-red-200/90 bg-red-50/95 px-5 py-3.5 text-[13px] text-red-900 shadow-sm dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100"
          role="status"
        >
          {error}
        </div>
      ) : null}

      <div className="w-full max-w-[min(100%,960px)] px-0">
        {userLoaded ? (
          <>
            <DashboardWorkspaceHero
              displayName={displayName}
              userId={user?.id}
              workspaceTimezone={exp.prefs.workspaceTimezone}
              summaryLoading={summaryLoading}
              projectCount={projectCount}
              extractionCount={extractionCount}
              liveConnectorCount={liveConnectorCount}
              readiness={readiness}
              onboardingComplete={onboardingComplete}
            />
            <div className="mt-6 space-y-6">
              <DashboardDailyBriefing
                displayName={displayName}
                projectCount={projectCount}
                extractionCount={extractionCount}
                liveConnectorCount={liveConnectorCount}
                readiness={readiness}
                summaryLoading={summaryLoading}
              />
            </div>
          </>
        ) : (
          <div
            className="dashboard-pro-skeleton h-[min(18rem,38vh)] animate-pulse"
            aria-hidden
          />
        )}

        <div className="mt-6 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/75 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
                Templates
              </span>
              <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
                One tap opens your composer with a starter structure — paste your notes, then{" "}
                <strong className="font-medium text-[var(--workspace-fg)]">Run extraction</strong>. If you
                don&apos;t have a project yet, we create one.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXTRACTION_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.use}
                disabled={Boolean(templateLoading)}
                onClick={() => void openTemplate(p.id)}
                className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 px-3 py-2 text-left text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-surface)] disabled:opacity-50"
              >
                {templateLoading === p.id ? "Opening…" : p.label}
              </button>
            ))}
          </div>
        </div>

        <DashboardInsightFeed
          projectCount={projectCount}
          extractionCount={extractionCount}
          liveConnectorCount={liveConnectorCount}
          readiness={readiness}
        />

        {!summaryLoading && recent.length > 0 ? (
          <div className="dashboard-pro-card relative mt-6 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 sm:px-7">
            <div
              className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[var(--workspace-accent)] to-fuchsia-500/60"
              aria-hidden
            />
            <div className="min-w-0 pl-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
                Latest extraction
              </p>
              <p className="mt-1 truncate text-[16px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
                {recent[0].projectName}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                {recent[0].summarySnippet}
              </p>
            </div>
            <Link
              href={`/projects/${recent[0].projectId}#ex-${recent[0].id}`}
              className="shrink-0 rounded-xl bg-[var(--workspace-fg)] px-5 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95"
            >
              Open
            </Link>
          </div>
        ) : null}

        <section
          id="new-project"
          className="dashboard-pro-card scroll-mt-24 mt-10 overflow-hidden"
          aria-label="Create project"
        >
          <div className="border-b border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/30 px-6 py-4 sm:px-7">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
              Create
            </h2>
            <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
              New project
            </p>
          </div>
          <form onSubmit={handleCreateSubmit} className="p-6 sm:p-7">
            <label htmlFor="new-project-name" className="sr-only">
              Project name
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <input
                id="new-project-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                placeholder="Q4 planning, Incident review…"
                autoComplete="off"
                className="min-h-[52px] flex-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 text-[16px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)]/80 focus:border-[var(--workspace-accent)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/18"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="inline-flex min-h-[52px] shrink-0 items-center justify-center rounded-xl bg-[var(--workspace-fg)] px-8 text-[14px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95 disabled:opacity-40"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-[var(--workspace-muted-fg)]">
              <kbd className="rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-1.5 py-0.5 font-mono text-[10px]">
                ⌘↵
              </kbd>{" "}
              create &amp; open
            </p>
          </form>
        </section>

        <section className="mt-14" aria-labelledby="all-projects-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--workspace-surface)] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10">
                <FolderOpen className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
              </span>
              <div>
                <h2
                  id="all-projects-heading"
                  className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]"
                >
                  Projects
                </h2>
                <p className="text-[12px] text-[var(--workspace-muted-fg)]">All workspaces</p>
              </div>
            </div>
          </div>
          {projects.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-6 py-14 text-center text-[13px] text-[var(--workspace-muted-fg)]">
              No projects yet — create one above.
            </p>
          ) : (
            <ul className="dashboard-pro-card divide-y divide-[var(--workspace-border)] overflow-hidden p-0">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="group flex min-h-[60px] items-center justify-between gap-4 px-6 py-5 transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate text-[15px] font-medium tracking-[-0.01em] text-[var(--workspace-fg)]">
                      {p.iconEmoji?.trim() ? (
                        <span className="shrink-0 text-[18px] leading-none" aria-hidden>
                          {p.iconEmoji.trim()}
                        </span>
                      ) : null}
                      <span className="truncate">{p.name}</span>
                      {isProjectNew(p.createdAt) ? (
                        <span className="shrink-0 rounded-md border border-[var(--workspace-accent)]/25 bg-[var(--workspace-accent)]/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-accent)]">
                          New
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--workspace-muted-fg)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14" aria-labelledby="recent-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              id="recent-heading"
              className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]"
            >
              Recent extractions
            </h2>
            {recent.length > 0 ? (
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                Newest first
              </span>
            ) : null}
          </div>
          {summaryLoading ? (
            <p className="text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-[13px] text-[var(--workspace-muted-fg)]">No runs yet.</p>
          ) : (
            <ul className="dashboard-pro-card divide-y divide-[var(--workspace-border)] overflow-hidden p-0">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/projects/${r.projectId}#extractions-section`}
                    className="flex gap-4 px-6 py-4 transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
                        {r.projectName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-[var(--workspace-fg)]">
                        {r.summarySnippet}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-[var(--workspace-muted-fg)]">
                      <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                      {formatRelative(r.createdAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mx-auto mt-16 max-w-[1100px] border-t border-[var(--workspace-border)] pt-10 text-center text-[11px] font-medium text-[var(--workspace-muted-fg)]">
        <Link href="/" className="hover:text-[var(--workspace-fg)]">
          route5.ai
        </Link>
        {" · "}
        <Link href="/docs/product" className="hover:text-[var(--workspace-fg)]">
          Product
        </Link>
        {" · "}
        <Link href="/integrations" className="hover:text-[var(--workspace-fg)]">
          Connections
        </Link>
      </p>
      <p className="mx-auto mt-4 max-w-[1100px] text-center text-[10px] leading-relaxed text-[var(--workspace-muted-fg)]">
        <Link href="/privacy" className="hover:text-[var(--workspace-fg)]">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-[var(--workspace-fg)]">
          Terms
        </Link>
        {" · "}
        <Link href="/docs/privacy" className="hover:text-[var(--workspace-fg)]">
          Legal (workspace)
        </Link>
      </p>
    </div>
  );
}

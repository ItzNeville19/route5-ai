"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import DashboardPurposeCard from "@/components/workspace/DashboardPurposeCard";
import DashboardRecentWork from "@/components/workspace/DashboardRecentWork";
import DashboardMarketplaceTeaser from "@/components/workspace/DashboardMarketplaceTeaser";
import DashboardPlanUsagePanel from "@/components/workspace/DashboardPlanUsagePanel";
import DashboardWorkspaceHero from "@/components/workspace/DashboardWorkspaceHero";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { isOnboardingComplete } from "@/lib/onboarding-storage";
import { EXTRACTION_PRESETS } from "@/lib/extraction-presets";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const exp = useWorkspaceExperience();
  const { pushToast } = exp;
  const { projects, summary, loadingProjects, loadingSummary, refreshAll } =
    useWorkspaceData();
  const [error, setError] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";
  const onboardingComplete = useMemo(
    () => Boolean(user?.id && isOnboardingComplete(user.id)),
    [user?.id]
  );

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#new-project") {
        window.dispatchEvent(new Event("route5:new-project-open"));
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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
            name: `Workspace — ${new Date().toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}`,
            iconEmoji: "📁",
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          project?: Project;
        };
        if (!res.ok || !data.project?.id) {
          setError(data.error ?? "Could not create a project for this template.");
          pushToast("Could not create a project.", "error");
          return;
        }
        pid = data.project.id;
        await refreshAll();
      }
      router.push(`/projects/${pid}?preset=${presetId}`);
      pushToast("Opening template…", "success");
    } finally {
      setTemplateLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-[min(100%,1440px)] pb-24">
      {error ? (
        <div
          className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/35 px-5 py-3 text-[13px] text-red-100 shadow-sm"
          role="status"
        >
          {error}
        </div>
      ) : null}

      {userLoaded ? (
        <div className="space-y-6">
          <DashboardWorkspaceHero
            displayName={displayName}
            userId={user?.id}
            workspaceTimezone={exp.prefs.workspaceTimezone}
            workspaceRegionKey={exp.prefs.workspaceRegionKey}
            summaryLoading={loadingSummary}
            projectCount={summary.projectCount}
            extractionCount={summary.extractionCount}
            readiness={summary.readiness}
            onboardingComplete={onboardingComplete}
            recent={summary.recent}
            activity={summary.activity}
            activitySeries={summary.activitySeries}
            execution={summary.execution}
          />

          <DashboardPurposeCard
            projectCount={summary.projectCount}
            extractionCount={summary.extractionCount}
            openaiReady={summary.readiness?.openai ?? false}
            linearReady={summary.readiness?.linear ?? false}
            githubReady={summary.readiness?.github ?? false}
            figmaReady={summary.readiness?.figma ?? false}
          />
        </div>
      ) : (
        <div
          className="dashboard-pro-skeleton h-[min(18rem,38vh)] animate-pulse"
          aria-hidden
        />
      )}

      <section
        id="new-project"
        className="dashboard-home-card scroll-mt-24 mt-6 rounded-[28px] px-5 py-5 sm:px-6 sm:py-6"
        aria-label="Create project, templates, and Desk"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
              Projects and Desk
            </p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
              Create, continue, or start from a template
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
              One place for the next useful step: open Desk for raw capture, spin up a workspace, jump back to recent
              work, or pick a template. The full wizard covers icon, template, and where you land after create.
            </p>
          </div>
          <Link
            href="/desk"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
          >
            Open Desk
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
            className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-fg)] px-5 py-5 text-left text-[var(--workspace-canvas)] shadow-sm transition hover:opacity-95"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-canvas)]/70">
              Create
            </p>
            <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em]">New project</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-canvas)]/78">
              Opens the builder: name, icon, template, and post-create destination.
            </p>
          </button>

          <Link
            href={projects[0] ? `/projects/${projects[0].id}` : "/desk"}
            className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/72 px-5 py-5 transition hover:bg-[var(--workspace-nav-hover)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
              Continue
            </p>
            <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
              {projects[0]?.name ?? "Open Desk"}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
              {projects[0]
                ? "Jump back into your most recently loaded workspace."
                : "If you are not ready to create a project yet, capture something in Desk first."}
            </p>
          </Link>
        </div>

        <div className="mt-8 border-t border-[var(--workspace-border)] pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
            Templates
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Each template opens a project with a starter shape for the kind of work you are doing.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {EXTRACTION_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.use}
                disabled={Boolean(templateLoading)}
                onClick={() => void openTemplate(p.id)}
                className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 py-4 text-left transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)] disabled:opacity-50"
              >
                <p className="text-[15px] font-semibold text-[var(--workspace-fg)]">
                  {templateLoading === p.id ? "Opening…" : p.label}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[var(--workspace-muted-fg)]">{p.use}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--workspace-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Prefer the guided flow step-by-step? The builder copies your link when the project is created.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-5 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
          >
            Open project builder
          </button>
        </div>
      </section>

      <div className="mt-6">
        <DashboardRecentWork
          projects={projects}
          recent={summary.recent}
          loading={loadingProjects || loadingSummary}
        />
      </div>

      {userLoaded ? (
        <div className="mt-6">
          <DashboardPlanUsagePanel />
        </div>
      ) : null}

      {userLoaded ? <DashboardMarketplaceTeaser /> : null}

      <div className="mt-14 border-t border-[var(--workspace-border)] pt-8 text-center">
        <p className="text-[11px] text-[var(--workspace-muted-fg)]">
          <Link href="/marketplace" className="hover:text-[var(--workspace-fg)]">
            Marketplace
          </Link>
          {" · "}
          <Link href="/" className="hover:text-[var(--workspace-fg)]">
            route5.ai
          </Link>
          {" · "}
          <Link href="/docs/product" className="hover:text-[var(--workspace-fg)]">
            Product
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-[var(--workspace-fg)]">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-[var(--workspace-fg)]">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelRight, Search } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useCommandPalette } from "@/components/CommandPalette";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

const repoSlug =
  process.env.NEXT_PUBLIC_WORKSPACE_REPO_SLUG?.trim() || "route5-ai";

function pageTitle(pathname: string | null): { kicker: string; title: string } {
  if (!pathname) return { kicker: "Route5", title: "Workspace" };
  if (pathname === "/projects") return { kicker: "Workspace", title: "Projects" };
  if (pathname === "/reports") return { kicker: "Workspace", title: "Reports" };
  if (pathname === "/desk") return { kicker: "Workspace", title: "Desk" };
  if (pathname === "/marketplace") return { kicker: "Workspace", title: "Marketplace" };
  if (pathname.startsWith("/marketplace/")) {
    return { kicker: "Marketplace", title: "Details" };
  }
  if (pathname === "/settings") return { kicker: "Workspace", title: "Settings" };
  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    return { kicker: "Workspace", title: "Documentation" };
  }
  if (pathname === "/support") return { kicker: "Workspace", title: "Support" };
  if (pathname === "/integrations" || pathname.startsWith("/integrations/")) {
    return { kicker: "Workspace", title: "Integrations" };
  }
  if (pathname === "/account/plans") return { kicker: "Workspace", title: "Plans" };
  if (pathname.startsWith("/projects/") && pathname !== "/projects") {
    return { kicker: "Workspace", title: "Project" };
  }
  return { kicker: "Route5", title: "Workspace" };
}

export default function WorkspaceHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();
  const [projectTitle, setProjectTitle] = useState<string | null>(null);

  const projectIdFromPath = pathname?.match(/^\/projects\/([^/]+)$/)?.[1] ?? null;

  useEffect(() => {
    if (!projectIdFromPath) {
      setProjectTitle(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectIdFromPath}`, {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          project?: { name?: string };
        };
        if (!cancelled && data.project?.name) setProjectTitle(data.project.name);
      } catch {
        if (!cancelled) setProjectTitle(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectIdFromPath]);

  const handle =
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "you";
  const repoPath = `${handle}/${repoSlug}`;

  const { kicker, title } = pageTitle(pathname);

  return (
    <header className="agent-header sticky top-0 z-30">
      <div className="mx-auto flex min-h-[52px] max-w-[min(100%,1200px)] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <Link
            href="/projects"
            className="shrink-0 text-[14px] font-semibold tracking-tight text-[var(--workspace-fg)]"
          >
            Route5
          </Link>
          <div className="min-w-0">
            {projectIdFromPath && projectTitle ? (
              <>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
                  {kicker}
                </p>
                <nav
                  className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 text-[13px] text-[var(--workspace-muted-fg)]"
                  aria-label="Breadcrumb"
                >
                  <Link href="/projects" className="shrink-0 font-medium hover:text-[var(--workspace-fg)]">
                    Projects
                  </Link>
                  <span className="opacity-50" aria-hidden>
                    /
                  </span>
                  <span className="truncate font-semibold text-[var(--workspace-fg)]">{projectTitle}</span>
                </nav>
              </>
            ) : (
              <>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
                  {kicker}
                </p>
                <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
                  {title}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/settings"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-1 ring-[var(--workspace-border)]",
              },
            }}
          />
          <p
            className="hidden max-w-[200px] truncate font-mono text-[11px] text-[var(--workspace-muted-fg)] md:block"
            title={repoPath}
          >
            {repoPath}
          </p>
          <nav
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Quick actions"
          >
            <button
              type="button"
              onClick={() => {
                const isOpen = exp.prefs.rightPanelOpen === true;
                exp.setPrefs({ rightPanelOpen: !isOpen });
              }}
              className="hidden rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:bg-white/[0.06] md:inline-flex md:items-center md:gap-1.5"
              title={exp.prefs.rightPanelOpen !== true ? "Show activity panel" : "Hide activity panel"}
              aria-pressed={exp.prefs.rightPanelOpen === true}
              aria-label="Toggle activity and API panel"
            >
              <PanelRight className="h-3.5 w-3.5 text-[var(--workspace-muted-fg)]" strokeWidth={2} aria-hidden />
              <span className="hidden lg:inline">Panel</span>
            </button>
            <button
              type="button"
              onClick={() => openPalette()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:bg-white/[0.06]"
              aria-label="Command palette"
            >
              <Search className="h-3.5 w-3.5 text-[var(--workspace-muted-fg)]" strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--workspace-muted-fg)] sm:inline">
                ⌘K
              </kbd>
            </button>
            <Link
              href="/docs"
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]"
            >
              Docs
            </Link>
            <Link
              href="/account/plans"
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]"
            >
              Plans
            </Link>
            <Link
              href="/support"
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]"
            >
              Support
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

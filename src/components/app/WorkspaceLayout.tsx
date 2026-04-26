"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceQueryHandler from "@/components/app/WorkspaceQueryHandler";
import WorkspaceShortcuts from "@/components/app/WorkspaceShortcuts";
import NewProjectModal from "@/components/workspace/NewProjectModal";
import WorkspaceSidebar from "@/components/app/WorkspaceSidebar";
import WorkspaceMobileNav from "@/components/app/WorkspaceMobileNav";
import WorkspaceMobileSidebar from "@/components/app/WorkspaceMobileSidebar";
import OrgRouteGuard from "@/components/app/OrgRouteGuard";
import {
  WorkspaceExperienceProvider,
  useWorkspaceExperience,
} from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { resolveWorkspaceTheme } from "@/lib/workspace-themes";
import { workspaceThemePhotoStyle } from "@/lib/workspace-theme-photos";
import { WorkspaceDataProvider } from "@/components/workspace/WorkspaceData";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import {
  BillingUpgradeProvider,
  BillingLimitQueryListener,
} from "@/components/billing/BillingUpgradeProvider";
import WorkspaceBillingBanner from "@/components/billing/WorkspaceBillingBanner";
import WorkspacePersistenceBanner from "@/components/workspace/WorkspacePersistenceBanner";
import { CaptureProvider } from "@/components/capture/CaptureProvider";
import { MemberProfilesProvider } from "@/components/workspace/MemberProfilesProvider";
import { CommitmentsProvider } from "@/components/commitments/CommitmentsProvider";

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const exp = useWorkspaceExperience();
  const { shellModifierClass, prefs } = exp;
  const appearanceTick = useAlignedMinuteTick();
  const resolvedTheme = useMemo(
    () => resolveWorkspaceTheme(prefs, appearanceTick),
    [prefs, appearanceTick]
  );
  const useCanvasPhotography =
    (prefs.workspaceCanvasBackground ?? "gradient") === "photo";
  const agentCanvasPhotoStyle = useMemo(() => {
    if (!useCanvasPhotography) return undefined;
    return workspaceThemePhotoStyle(resolvedTheme.resolvedId);
  }, [useCanvasPhotography, resolvedTheme.resolvedId]);
  const sidebarHidden = prefs.sidebarHidden === true;
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useEffect(() => {
    const closeMobile = () => setMobileSidebarOpen(false);
    window.addEventListener("route5:mobile-sidebar-close", closeMobile);
    return () => window.removeEventListener("route5:mobile-sidebar-close", closeMobile);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const syncDesktopState = () => {
      const sidebar = document.querySelector<HTMLElement>('[data-route5-sidebar="desktop"]');
      if (!sidebar) return;
      if (window.getComputedStyle(sidebar).display !== "none") {
        setMobileSidebarOpen(false);
      }
    };
    syncDesktopState();
    window.addEventListener("resize", syncDesktopState);
    return () => window.removeEventListener("resize", syncDesktopState);
  }, []);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key !== "\\" && e.code !== "Backslash") return;
      const t = e.target as HTMLElement | null;
      if (
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.tagName === "SELECT" ||
        t?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      exp.setPrefs({ sidebarHidden: !sidebarHidden });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exp, sidebarHidden]);

  useEffect(() => {
    const core = ["/overview", "/desk", "/settings", "/workspace/help"];
    core.forEach((path) => router.prefetch(path));
  }, [router]);

  return (
    <div
      className={`theme-agent-shell theme-route5-command relative flex min-h-dvh w-full text-[var(--workspace-fg)] ${shellModifierClass}`.trim()}
    >
      <WorkspaceShortcuts />
      <Suspense fallback={null}>
        <OrgRouteGuard />
      </Suspense>
      <Suspense fallback={null}>
        <WorkspaceQueryHandler />
      </Suspense>

      <div className="flex min-h-dvh w-full">
        <Suspense fallback={null}>
          <WorkspaceSidebar />
        </Suspense>
        <div
          className="route5-brand-agent-shell agent-canvas relative z-10 flex min-h-dvh min-w-0 flex-1 flex-col"
          style={agentCanvasPhotoStyle ?? undefined}
        >
          <WorkspaceHeader
            onSidebarToggle={() => {
              if (typeof window === "undefined") return;
              const sidebar = document.querySelector<HTMLElement>('[data-route5-sidebar="desktop"]');
              const desktopSidebarVisible =
                !!sidebar && window.getComputedStyle(sidebar).display !== "none";
              const desktopLayout = desktopSidebarVisible || window.innerWidth >= 768;
              if (!desktopLayout) {
                setMobileSidebarOpen((v) => !v);
                return;
              }
              setMobileSidebarOpen(false);
              exp.setPrefs({ sidebarHidden: !sidebarHidden });
            }}
          />
          <WorkspaceBillingBanner />
          <WorkspacePersistenceBanner />
          <main className="route5-brand-canvas min-h-0 flex-1 overflow-y-auto pb-[calc(var(--r5-mobile-nav-height)+env(safe-area-inset-bottom))] md:pb-0 [@media(pointer:fine)]:pb-0">
            <div className="workspace-page-inner relative mx-auto w-full max-w-[min(100%,1440px)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-4)] sm:px-[var(--r5-content-padding-x)] sm:py-[var(--r5-space-5)]">
              <div key={pathname} className="route5-page-transition">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      <WorkspaceMobileSidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <WorkspaceMobileNav />
      <NewProjectModal />
    </div>
  );
}

/** Signed-in shell: command canvas + glass chrome; prefs and toasts from WorkspaceExperience. */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceExperienceProvider>
      <I18nProvider>
        <WorkspaceDataProvider>
          <BillingUpgradeProvider>
            <BillingLimitQueryListener />
            <CaptureProvider>
              <MemberProfilesProvider>
                <CommitmentsProvider>
                  <WorkspaceShell>{children}</WorkspaceShell>
                </CommitmentsProvider>
              </MemberProfilesProvider>
            </CaptureProvider>
          </BillingUpgradeProvider>
        </WorkspaceDataProvider>
      </I18nProvider>
    </WorkspaceExperienceProvider>
  );
}

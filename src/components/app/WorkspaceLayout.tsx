"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceQueryHandler from "@/components/app/WorkspaceQueryHandler";
import WorkspaceShortcuts from "@/components/app/WorkspaceShortcuts";
import NewProjectModal from "@/components/workspace/NewProjectModal";
import WorkspaceSidebar from "@/components/app/WorkspaceSidebar";
import WorkspaceMobileNav from "@/components/app/WorkspaceMobileNav";
import {
  WorkspaceExperienceProvider,
  useWorkspaceExperience,
} from "@/components/workspace/WorkspaceExperience";
import { WorkspaceDataProvider } from "@/components/workspace/WorkspaceData";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import {
  BillingUpgradeProvider,
  BillingLimitQueryListener,
} from "@/components/billing/BillingUpgradeProvider";
import WorkspaceBillingBanner from "@/components/billing/WorkspaceBillingBanner";
import { CaptureProvider } from "@/components/capture/CaptureProvider";
import { MemberProfilesProvider } from "@/components/workspace/MemberProfilesProvider";

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const exp = useWorkspaceExperience();
  const { shellModifierClass, prefs } = exp;
  const sidebarHidden = prefs.sidebarHidden === true;
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key !== "\\") return;
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
    const core = ["/feed", "/projects", "/overview", "/workspace/escalations", "/workspace/dashboard"];
    core.forEach((path) => router.prefetch(path));
  }, [router]);

  return (
    <div
      className={`theme-agent-shell theme-route5-command relative flex min-h-dvh w-full text-[var(--workspace-fg)] ${shellModifierClass}`.trim()}
    >
      <WorkspaceShortcuts />
      <Suspense fallback={null}>
        <WorkspaceQueryHandler />
      </Suspense>

      <div className="flex min-h-dvh w-full">
        <WorkspaceSidebar />
        <div className="agent-canvas relative z-10 flex min-h-dvh min-w-0 flex-1 flex-col">
          <WorkspaceHeader />
          <WorkspaceBillingBanner />
          <main className="min-h-0 flex-1 overflow-y-auto pb-[var(--r5-mobile-nav-height)] md:pb-0 [@media(pointer:fine)]:pb-0">
            <div className="workspace-page-inner relative mx-auto w-full max-w-[min(100%,1440px)] px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-5)] sm:px-[var(--r5-content-padding-x)] sm:py-[var(--r5-space-6)]">
              {children}
            </div>
          </main>
        </div>
      </div>
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
                <WorkspaceShell>{children}</WorkspaceShell>
              </MemberProfilesProvider>
            </CaptureProvider>
          </BillingUpgradeProvider>
        </WorkspaceDataProvider>
      </I18nProvider>
    </WorkspaceExperienceProvider>
  );
}

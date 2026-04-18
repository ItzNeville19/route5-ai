"use client";

import { Suspense } from "react";
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

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const exp = useWorkspaceExperience();
  const { shellModifierClass } = exp;

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
          <main className="min-h-0 flex-1 overflow-y-auto pb-[var(--r5-mobile-nav-height)] md:pb-0">
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
              <WorkspaceShell>{children}</WorkspaceShell>
            </CaptureProvider>
          </BillingUpgradeProvider>
        </WorkspaceDataProvider>
      </I18nProvider>
    </WorkspaceExperienceProvider>
  );
}

"use client";

import { Suspense } from "react";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceQueryHandler from "@/components/app/WorkspaceQueryHandler";
import WorkspaceShortcuts from "@/components/app/WorkspaceShortcuts";
import NewProjectModal from "@/components/workspace/NewProjectModal";
import WorkspaceSidebar from "@/components/app/WorkspaceSidebar";
import {
  WorkspaceExperienceProvider,
  useWorkspaceExperience,
} from "@/components/workspace/WorkspaceExperience";
import { WorkspaceDataProvider } from "@/components/workspace/WorkspaceData";
import { I18nProvider } from "@/components/i18n/I18nProvider";

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
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="workspace-page-inner mx-auto w-full max-w-[min(100%,1440px)] px-4 py-6 sm:px-8 sm:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
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
          <WorkspaceShell>{children}</WorkspaceShell>
        </WorkspaceDataProvider>
      </I18nProvider>
    </WorkspaceExperienceProvider>
  );
}

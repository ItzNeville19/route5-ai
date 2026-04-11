"use client";

import { Suspense } from "react";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceQueryHandler from "@/components/app/WorkspaceQueryHandler";
import WorkspaceShortcuts from "@/components/app/WorkspaceShortcuts";
import WorkspaceAssistant from "@/components/app/WorkspaceAssistant";
import WorkspaceRightPanel from "@/components/app/WorkspaceRightPanel";
import WorkspaceSidebar from "@/components/app/WorkspaceSidebar";
import {
  WorkspaceExperienceProvider,
  useWorkspaceExperience,
} from "@/components/workspace/WorkspaceExperience";

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { shellModifierClass } = useWorkspaceExperience();
  return (
    <div
      className={`theme-agent-shell relative flex min-h-dvh w-full flex-col text-neutral-900 md:flex-row ${shellModifierClass}`.trim()}
    >
      <WorkspaceShortcuts />
      <Suspense fallback={null}>
        <WorkspaceQueryHandler />
      </Suspense>

      <WorkspaceSidebar />

      <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col md:order-2 md:flex-row">
        <div className="agent-canvas relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkspaceHeader />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="workspace-page-inner mx-auto w-full max-w-[min(100%,1200px)] px-4 py-6 sm:px-8 sm:py-8">
              {children}
            </div>
          </main>
        </div>
        <WorkspaceRightPanel />
      </div>
      <WorkspaceAssistant />
    </div>
  );
}

/** Lavender workspace chrome — preferences and toasts from WorkspaceExperience. */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceExperienceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceExperienceProvider>
  );
}

"use client";

import { Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import WorkspaceQueryHandler from "@/components/app/WorkspaceQueryHandler";
import WorkspaceShortcuts from "@/components/app/WorkspaceShortcuts";
import NewProjectModal from "@/components/workspace/NewProjectModal";
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
import { CaptureProvider } from "@/components/capture/CaptureProvider";
import { MemberProfilesProvider } from "@/components/workspace/MemberProfilesProvider";
import { CommitmentsProvider } from "@/components/commitments/CommitmentsProvider";
import WorkspaceTopToolbar from "@/components/workspace/WorkspaceTopToolbar";

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
  const pathname = usePathname() ?? "";

  return (
    <div
      className={`theme-agent-shell theme-route5-command relative min-h-dvh w-full text-[var(--workspace-fg)] ${shellModifierClass}`.trim()}
    >
      <WorkspaceShortcuts />
      <Suspense fallback={null}>
        <OrgRouteGuard />
      </Suspense>
      <Suspense fallback={null}>
        <WorkspaceQueryHandler />
      </Suspense>

      <div className="route5-premium-shell-bg relative min-h-dvh w-full px-2 py-2 sm:px-3 sm:py-3">
        <div
          className="route5-brand-agent-shell agent-canvas relative z-10 mx-auto flex min-h-[calc(100dvh-16px)] w-full max-w-[1600px] min-w-0 flex-col rounded-[28px] border border-[#2a3b2e] bg-[linear-gradient(180deg,#0a0f0b_0%,#0f1510_100%)] p-2 shadow-[0_40px_120px_-72px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(132,255,168,0.1)] sm:p-3"
          style={agentCanvasPhotoStyle ?? undefined}
        >
          <WorkspaceTopToolbar />
          <main className="route5-brand-canvas min-h-0 flex-1 overflow-y-auto">
            <div className="workspace-page-inner relative mx-auto w-full max-w-[1540px] px-1 pb-2 sm:px-2 sm:pb-3">
              <div key={pathname} className="route5-page-transition">
                {children}
              </div>
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

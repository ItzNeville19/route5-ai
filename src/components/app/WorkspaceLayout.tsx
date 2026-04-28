"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useOrganization } from "@clerk/nextjs";
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
import { workspaceThemePhotoStyleFromPrefs } from "@/lib/workspace-theme-photos";
import { WorkspaceDataProvider, useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import {
  BillingUpgradeProvider,
  BillingLimitQueryListener,
} from "@/components/billing/BillingUpgradeProvider";
import { CaptureProvider } from "@/components/capture/CaptureProvider";
import { MemberProfilesProvider } from "@/components/workspace/MemberProfilesProvider";
import { CommitmentsProvider } from "@/components/commitments/CommitmentsProvider";
import WorkspaceTopToolbar from "@/components/workspace/WorkspaceTopToolbar";
import WorkspaceRoleRedirects from "@/components/workspace/WorkspaceRoleRedirects";
import { WorkspaceChromeActionsProvider } from "@/components/workspace/WorkspaceChromeActions";
import WorkspaceNewTaskDrawer from "@/components/workspace/WorkspaceNewTaskDrawer";
import WorkspaceRunAgentSheet from "@/components/workspace/WorkspaceRunAgentSheet";
import WorkspaceSendUpdateModal from "@/components/workspace/WorkspaceSendUpdateModal";
import WorkspaceInteractiveTour from "@/components/workspace/WorkspaceInteractiveTour";

function WorkspaceOrganizationMembershipSync() {
  const { refreshOrganization } = useWorkspaceData();
  const { organization, membership } = useOrganization();
  useEffect(() => {
    void refreshOrganization();
  }, [organization?.id, membership?.id, membership?.role, refreshOrganization]);
  return null;
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const exp = useWorkspaceExperience();
  const { shellModifierClass, prefs, workspacePaletteLight } = exp;
  const appearanceTick = useAlignedMinuteTick();
  const resolvedTheme = useMemo(
    () => resolveWorkspaceTheme(prefs, appearanceTick),
    [prefs, appearanceTick]
  );
  const useCanvasPhotography =
    (prefs.workspaceCanvasBackground ?? "gradient") === "photo";
  const agentCanvasPhotoStyle = useMemo(() => {
    if (!useCanvasPhotography) return undefined;
    return workspaceThemePhotoStyleFromPrefs(prefs, resolvedTheme.resolvedId);
  }, [useCanvasPhotography, prefs, resolvedTheme.resolvedId]);
  const pathname = usePathname() ?? "";

  /** Border + elevation only — canvas `background-image` comes from `.workspace-theme-* .agent-canvas` in globals.css.
   *  Do not set Tailwind `bg-*` here; it overrides themed gradients and made “Sunrise” etc. look unchanged. */
  const agentShellToneClass = workspacePaletteLight
    ? "!border-slate-200/65 bg-transparent shadow-[0_28px_88px_-56px_rgba(15,23,42,0.11),inset_0_1px_0_rgba(255,255,255,0.78)]"
    : "border-[#2a3b2e] bg-transparent shadow-[0_40px_120px_-72px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(132,255,168,0.1)]";

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
      <WorkspaceOrganizationMembershipSync />
      <WorkspaceRoleRedirects />
      <WorkspaceInteractiveTour />

      <div className="route5-premium-shell-bg relative min-h-dvh w-full">
        <div
          className={`route5-brand-agent-shell route5-ocean-shell route5-workspace-shell-fullbleed agent-canvas relative z-10 mx-auto flex min-h-dvh w-full min-w-0 flex-col border-0 p-0 ${agentShellToneClass}`}
          data-route5-canvas-photo={useCanvasPhotography ? "true" : "false"}
          data-route5-shell-palette={workspacePaletteLight ? "light" : "dark"}
          style={agentCanvasPhotoStyle ?? undefined}
        >
          <WorkspaceTopToolbar />
          <WorkspaceNewTaskDrawer />
          <WorkspaceRunAgentSheet />
          <WorkspaceSendUpdateModal />
          <main className="route5-brand-canvas min-h-0 flex-1 overflow-y-auto">
            <div className="workspace-page-inner relative mx-auto w-full max-w-[min(100%,1720px)] px-3 pb-[max(0.75rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] pt-5 sm:px-4 sm:pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom,0px)))] sm:pt-7 lg:px-5 lg:pt-8">
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
          <WorkspaceChromeActionsProvider>
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
          </WorkspaceChromeActionsProvider>
        </WorkspaceDataProvider>
      </I18nProvider>
    </WorkspaceExperienceProvider>
  );
}

"use client";

import { useMemo } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Tag } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { isLightWorkspacePalette, resolveWorkspaceTheme } from "@/lib/workspace-themes";
/**
 * Clerk’s default appearance + OS color-scheme can paint light panels with light text on dark workspace themes.
 * We drive `appearance.variables` from the same light/dark split as the shell (not from OS alone).
 */
export default function SettingsClerkUserProfile() {
  const { prefs } = useWorkspaceExperience();
  const tick = useAlignedMinuteTick();
  const { resolvedId } = useMemo(() => resolveWorkspaceTheme(prefs, tick), [prefs, tick]);
  const light = isLightWorkspacePalette(resolvedId);

  const appearance = useMemo(
    () => ({
      elements: {
        rootBox: "w-full",
        card: "border-0 shadow-none bg-transparent w-full max-w-none",
        cardBox: "w-full max-w-none shadow-none rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]",
        scrollBox: "max-h-[min(72vh,720px)] overflow-y-auto text-[var(--workspace-fg)]",
        navbar:
          "border-b border-[var(--workspace-border)] bg-[var(--workspace-surface)] text-[var(--workspace-fg)] sm:border-b-0 sm:border-r",
        navbarButton:
          "text-[14px] text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)] data-[active=true]:bg-[var(--workspace-accent)]/15 data-[active=true]:text-[var(--workspace-accent)]",
        pageScrollBox: "overflow-y-auto bg-[var(--workspace-canvas)] text-[var(--workspace-fg)]",
        page: "text-[var(--workspace-fg)]",
        pageListItem: "text-[var(--workspace-fg)]",
        pageListItemTitle: "text-[var(--workspace-fg)]",
        pageListItemSubtitle: "text-[var(--workspace-muted-fg)]",
        profileSection: "text-[var(--workspace-fg)]",
        profileSectionTitle: "text-[var(--workspace-fg)]",
        profileSectionContent: "text-[var(--workspace-fg)]",
        profileSectionHeaderTitle: "text-[var(--workspace-fg)]",
        profileSectionHeaderSubtitle: "text-[var(--workspace-muted-fg)]",
        pageHeader: "text-[var(--workspace-fg)]",
        headerTitle: "text-[var(--workspace-fg)]",
        headerSubtitle: "text-[var(--workspace-muted-fg)]",
        formFieldLabel: "text-[var(--workspace-fg)]",
        formFieldInput:
          "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/70 text-[var(--workspace-fg)]",
        formFieldSuccessText: "text-[var(--workspace-muted-fg)]",
        formFieldErrorText: "text-[var(--workspace-danger-fg,#f87171)]",
        alert: "border-[var(--workspace-border)] bg-[var(--workspace-surface)] text-[var(--workspace-fg)]",
        identityPreview: "text-[var(--workspace-fg)]",
        identityPreviewText: "text-[var(--workspace-fg)]",
        badge: "text-[var(--workspace-fg)]",
        profileSectionPrimaryButton: "text-[var(--workspace-on-accent)]",
        profileSectionSecondaryButton: "text-[var(--workspace-fg)]",
        profileSection__danger: "hidden",
      },
      variables: light
        ? {
            colorPrimary: "#7c3aed",
            colorPrimaryForeground: "#ffffff",
            colorBackground: "#ffffff",
            colorForeground: "#0f172a",
            colorMutedForeground: "#64748b",
            colorMuted: "rgba(15, 23, 42, 0.06)",
            colorBorder: "rgba(15, 23, 42, 0.12)",
            colorNeutral: "rgba(15, 23, 42, 0.08)",
            colorInput: "#ffffff",
            colorInputForeground: "#0f172a",
            borderRadius: "0.75rem",
          }
        : {
            colorPrimary: "#93c5fd",
            colorPrimaryForeground: "#0f172a",
            colorBackground: "rgba(15, 23, 42, 0.96)",
            colorForeground: "#f8fafc",
            colorMutedForeground: "#cbd5e1",
            colorMuted: "rgba(148, 163, 184, 0.14)",
            colorBorder: "rgba(148, 163, 184, 0.28)",
            colorNeutral: "rgba(148, 163, 184, 0.2)",
            colorInput: "rgba(30, 41, 59, 0.92)",
            colorInputForeground: "#f8fafc",
            borderRadius: "0.75rem",
          },
    }),
    [light]
  );

  return (
    <div
      className={`dashboard-home-card route5-settings-clerk-profile min-h-[480px] w-full overflow-visible rounded-xl [&_.cl-rootBox]:!w-full [&_.cl-card]:!w-full [&_.cl-card]:!max-w-none [&_.cl-card]:!shadow-none ${light ? "route5-settings-clerk-profile--light" : "route5-settings-clerk-profile--dark"}`}
    >
      <UserProfile routing="hash" appearance={appearance}>
        <UserProfile.Page label="account" />
        <UserProfile.Page label="security" />
        <UserProfile.Link
          label="Route5 plans"
          url="/account/plans"
          labelIcon={<Tag className="h-4 w-4 text-[var(--workspace-muted-fg)]" aria-hidden />}
        />
      </UserProfile>
    </div>
  );
}

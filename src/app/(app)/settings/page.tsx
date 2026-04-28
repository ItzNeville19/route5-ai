"use client";

import Link from "next/link";
import SettingsIngestWebhookCard from "@/components/settings/SettingsIngestWebhookCard";
import SettingsClerkUserProfile from "@/components/settings/SettingsClerkUserProfile";
import AccountDangerZone from "@/components/settings/AccountDangerZone";
import OrganizationDangerZone from "@/components/settings/OrganizationDangerZone";
import WorkspaceAiSettingsCard from "@/components/workspace/WorkspaceAiSettingsCard";
import WorkspacePreferencesCard from "@/components/workspace/WorkspacePreferencesCard";
import {
  getDesktopDownloadUrl,
  isDesktopDownloadConfigured,
} from "@/lib/desktop-install-url";

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`rounded-[var(--r5-radius-lg)] border border-white/12 bg-[#0e141c]/95 p-[var(--r5-space-4)] shadow-sm backdrop-blur-sm ${id ? "scroll-mt-28" : ""}`}
    >
      <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-[var(--r5-text-primary)]">
        {title}
      </h2>
      <p className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-body)] text-[var(--r5-text-secondary)]">
        {description}
      </p>
      <div className="mt-[var(--r5-space-4)]">{children}</div>
    </section>
  );
}

export default function WorkspaceSettingsPage() {
  const desktopDownloadUrl = getDesktopDownloadUrl();
  const showDirectMacInstaller = isDesktopDownloadConfigured();

  return (
    <div className="route5-settings-surface mx-auto w-full max-w-[960px] space-y-[var(--r5-space-5)] pb-[var(--r5-space-4)]">
      <div>
        <Link
          href="/workspace/dashboard"
          className="text-[length:var(--r5-font-body)] text-[var(--r5-text-secondary)] transition hover:text-[var(--r5-text-primary)]"
        >
          ← Dashboard
        </Link>
      </div>

      <SettingsSection
        id="settings-account"
        title="Account"
        description="Manage your profile and sign-in details."
      >
        <div className="space-y-[var(--r5-space-4)]">
          <SettingsClerkUserProfile />
          <AccountDangerZone />
          <OrganizationDangerZone />
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-preferences"
        title="Preferences"
        description="Location, timezone, language, and workspace surface settings."
      >
        <WorkspacePreferencesCard />
      </SettingsSection>

      <SettingsSection
        id="settings-desktop"
        title="Desktop app"
        description="When Route5 provides an installer for your organization, it uses the same workspace as the web app in a dedicated window."
      >
        <p className="text-[length:var(--r5-font-body)] text-[var(--r5-text-secondary)]">
          On Mac, open the disk image and drag Route5 into Applications. On Windows, run the installer your team ships
          from IT.
        </p>
        <div className="mt-[var(--r5-space-3)] flex flex-col gap-[var(--r5-space-2)] sm:flex-row sm:flex-wrap">
          <Link
            href="/download"
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center justify-center gap-2 rounded-[var(--r5-radius-pill)] border border-white/15 bg-white/[0.07] px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-[var(--r5-text-primary)] transition hover:bg-white/[0.11]"
          >
            Desktop &amp; install options
            <span className="text-[var(--r5-text-tertiary)]" aria-hidden>
              ↗
            </span>
          </Link>
          {showDirectMacInstaller ? (
            <a
              href={desktopDownloadUrl}
              rel="noopener noreferrer"
              className="inline-flex min-h-[var(--r5-nav-item-height)] items-center justify-center gap-2 rounded-[var(--r5-radius-pill)] border border-emerald-400/35 bg-emerald-500/15 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-[var(--r5-text-primary)] transition hover:bg-emerald-500/25"
            >
              Download Mac installer
              <span className="text-[var(--r5-text-tertiary)]" aria-hidden>
                ↗
              </span>
            </a>
          ) : (
            <Link
              href="/download"
              className="inline-flex min-h-[var(--r5-nav-item-height)] items-center justify-center gap-2 rounded-[var(--r5-radius-pill)] border border-emerald-400/35 bg-emerald-500/15 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-[var(--r5-text-primary)] transition hover:bg-emerald-500/25"
            >
              Get the Mac build (download page)
              <span className="text-[var(--r5-text-tertiary)]" aria-hidden>
                ↗
              </span>
            </Link>
          )}
        </div>
        {!showDirectMacInstaller ? (
          <p className="mt-[var(--r5-space-3)] text-[13px] leading-relaxed text-[var(--r5-text-secondary)]">
            A direct <span className="font-mono text-[var(--r5-text-primary)]">.dmg</span> link appears here when your
            team sets <span className="font-mono text-[var(--r5-text-primary)]">NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL</span>{" "}
            — until then, use the download page (no broken file link).
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        id="settings-notifications"
        title="Notifications"
        description="Choose delivery channels for updates, follow-ups, and digests."
      >
        <Link
          href="/workspace/notifications/preferences"
          className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-white/15 bg-white/[0.07] px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-[var(--r5-text-primary)] transition hover:bg-white/[0.11]"
        >
          Open notification preferences
        </Link>
      </SettingsSection>

      <SettingsSection
        id="settings-ai"
        title="AI Settings"
        description="Control model behavior and capture sensitivity."
      >
        <WorkspaceAiSettingsCard />
      </SettingsSection>

      <SettingsSection
        id="settings-integrations"
        title="Integrations"
        description="Webhook and email forwarding are live. Connect Slack, Gmail, and Notion from Integrations."
      >
        <div className="space-y-[var(--r5-space-3)]">
          <SettingsIngestWebhookCard />
          <div className="grid gap-[var(--r5-space-2)] sm:grid-cols-3">
            {[
              { name: "Slack", href: "/integrations/slack" },
              { name: "Gmail", href: "/integrations/google" },
              { name: "Notion", href: "/integrations" },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="rounded-[var(--r5-radius-md)] border border-white/12 bg-white/[0.05] px-[var(--r5-space-3)] py-[var(--r5-space-2)] transition hover:bg-white/[0.09]"
              >
                <p className="text-[length:var(--r5-font-body)] font-medium text-[var(--r5-text-primary)]">
                  {item.name}
                </p>
                <p className="mt-[var(--r5-space-1)] text-[12px] text-[var(--r5-text-secondary)]">Open integration</p>
              </Link>
            ))}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

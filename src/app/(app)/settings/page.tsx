"use client";

import Link from "next/link";
import SettingsIngestWebhookCard from "@/components/settings/SettingsIngestWebhookCard";
import SettingsClerkUserProfile from "@/components/settings/SettingsClerkUserProfile";
import AccountDangerZone from "@/components/settings/AccountDangerZone";
import OrganizationDangerZone from "@/components/settings/OrganizationDangerZone";
import WorkspaceAiSettingsCard from "@/components/workspace/WorkspaceAiSettingsCard";
import WorkspacePreferencesCard from "@/components/workspace/WorkspacePreferencesCard";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
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
  const { workspacePaletteLight } = useWorkspaceExperience();
  const light = workspacePaletteLight;

  return (
    <section
      id={id}
      className={
        light
          ? `rounded-[var(--r5-radius-lg)] border border-slate-200/90 bg-white/95 p-[var(--r5-space-4)] shadow-[0_12px_40px_-28px_rgba(15,23,42,0.08)] backdrop-blur-sm ${id ? "scroll-mt-28" : ""}`
          : `rounded-[var(--r5-radius-lg)] border border-white/12 bg-[#0e141c]/95 p-[var(--r5-space-4)] shadow-sm backdrop-blur-sm ${id ? "scroll-mt-28" : ""}`
      }
    >
      <h2
        className={`text-[length:var(--r5-font-subheading)] font-semibold ${
          light ? "text-[var(--workspace-fg)]" : "text-zinc-50"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-[var(--r5-space-1)] text-[length:var(--r5-font-body)] ${
          light ? "text-[var(--workspace-muted-fg)]" : "text-zinc-400"
        }`}
      >
        {description}
      </p>
      <div className="mt-[var(--r5-space-4)]">{children}</div>
    </section>
  );
}

export default function WorkspaceSettingsPage() {
  const { t } = useI18n();
  const { workspacePaletteLight } = useWorkspaceExperience();
  const light = workspacePaletteLight;

  const desktopDownloadUrl = getDesktopDownloadUrl();
  const showDirectMacInstaller = isDesktopDownloadConfigured();

  const btnOutline = light
    ? "inline-flex min-h-[var(--r5-nav-item-height)] items-center justify-center gap-2 rounded-[var(--r5-radius-pill)] border border-slate-200/90 bg-white px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
    : "inline-flex min-h-[var(--r5-nav-item-height)] items-center justify-center gap-2 rounded-[var(--r5-radius-pill)] border border-white/15 bg-white/[0.07] px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-zinc-100 transition hover:bg-white/[0.11]";

  const btnEmerald = light
    ? "inline-flex min-h-[var(--r5-nav-item-height)] items-center justify-center gap-2 rounded-[var(--r5-radius-pill)] border border-emerald-500/40 bg-emerald-50 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-emerald-950 transition hover:bg-emerald-100/90"
    : "inline-flex min-h-[var(--r5-nav-item-height)] items-center justify-center gap-2 rounded-[var(--r5-radius-pill)] border border-emerald-400/35 bg-emerald-500/15 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-zinc-100 transition hover:bg-emerald-500/25";

  const btnGhostRow = light
    ? "inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-slate-200/90 bg-white px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
    : "inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-white/15 bg-white/[0.07] px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-zinc-100 transition hover:bg-white/[0.11]";

  const integrationCard = light
    ? "rounded-[var(--r5-radius-md)] border border-slate-200/90 bg-white px-[var(--r5-space-3)] py-[var(--r5-space-2)] shadow-sm transition hover:bg-slate-50"
    : "rounded-[var(--r5-radius-md)] border border-white/12 bg-white/[0.05] px-[var(--r5-space-3)] py-[var(--r5-space-2)] transition hover:bg-white/[0.09]";

  const integrationTitle = light ? "text-slate-900" : "text-zinc-100";
  const integrationSub = light ? "text-slate-600" : "text-zinc-400";
  const arrowMuted = light ? "text-slate-400" : "text-zinc-500";
  const bodyMuted = light ? "text-slate-600" : "text-zinc-400";

  const integrations = [
    { nameKey: "settings.integrations.slack" as const, href: "/integrations/slack" },
    { nameKey: "settings.integrations.gmail" as const, href: "/integrations/google" },
    { nameKey: "settings.integrations.notion" as const, href: "/integrations" },
  ];

  return (
    <div className="route5-settings-surface mx-auto w-full max-w-[960px] space-y-[var(--r5-space-5)] pb-[var(--r5-space-4)]">
      <div>
        <Link
          href="/workspace/dashboard"
          className="text-[length:var(--r5-font-body)] text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          {t("settings.backDashboard")}
        </Link>
      </div>

      <SettingsSection
        id="settings-account"
        title={t("settings.section.account.title")}
        description={t("settings.section.account.desc")}
      >
        <div className="space-y-[var(--r5-space-4)]">
          <SettingsClerkUserProfile />
          <AccountDangerZone />
          <OrganizationDangerZone />
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-preferences"
        title={t("settings.section.preferences.title")}
        description={t("settings.section.preferences.desc")}
      >
        <WorkspacePreferencesCard />
      </SettingsSection>

      <SettingsSection
        id="settings-desktop"
        title={t("settings.section.desktop.title")}
        description={t("settings.section.desktop.desc")}
      >
        <p className={`text-[length:var(--r5-font-body)] ${bodyMuted}`}>
          {t("settings.section.desktop.body")}
        </p>
        <div className="mt-[var(--r5-space-3)] flex flex-col gap-[var(--r5-space-2)] sm:flex-row sm:flex-wrap">
          <Link href="/download" className={btnOutline}>
            {t("settings.section.desktop.downloadOptions")}
            <span className={arrowMuted} aria-hidden>
              ↗
            </span>
          </Link>
          {showDirectMacInstaller ? (
            <a href={desktopDownloadUrl} rel="noopener noreferrer" className={btnEmerald}>
              {t("settings.section.desktop.downloadMac")}
              <span className={arrowMuted} aria-hidden>
                ↗
              </span>
            </a>
          ) : (
            <Link href="/download" className={btnEmerald}>
              {t("settings.section.desktop.getMacBuild")}
              <span className={arrowMuted} aria-hidden>
                ↗
              </span>
            </Link>
          )}
        </div>
        {!showDirectMacInstaller ? (
          <p className={`mt-[var(--r5-space-3)] text-[13px] leading-relaxed ${bodyMuted}`}>
            {t("settings.section.desktop.dmgHint", {
              dmg: ".dmg",
              envVar: "NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL",
            })}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        id="settings-notifications"
        title={t("settings.section.notifications.title")}
        description={t("settings.section.notifications.desc")}
      >
        <Link href="/workspace/notifications/preferences" className={btnGhostRow}>
          {t("settings.section.notifications.open")}
        </Link>
      </SettingsSection>

      <SettingsSection
        id="settings-ai"
        title={t("settings.section.ai.title")}
        description={t("settings.section.ai.desc")}
      >
        <WorkspaceAiSettingsCard />
      </SettingsSection>

      <SettingsSection
        id="settings-integrations"
        title={t("settings.section.integrations.title")}
        description={t("settings.section.integrations.desc")}
      >
        <div className="space-y-[var(--r5-space-3)]">
          <SettingsIngestWebhookCard />
          <div className="grid gap-[var(--r5-space-2)] sm:grid-cols-3">
            {integrations.map((item) => (
              <Link key={item.nameKey} href={item.href} className={integrationCard}>
                <p className={`text-[length:var(--r5-font-body)] font-medium ${integrationTitle}`}>
                  {t(item.nameKey)}
                </p>
                <p className={`mt-[var(--r5-space-1)] text-[12px] ${integrationSub}`}>
                  {t("settings.integrations.open")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

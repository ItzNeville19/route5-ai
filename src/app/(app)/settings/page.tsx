"use client";

import Link from "next/link";
import SettingsIngestWebhookCard from "@/components/settings/SettingsIngestWebhookCard";
import SettingsClerkUserProfile from "@/components/settings/SettingsClerkUserProfile";
import AccountDangerZone from "@/components/settings/AccountDangerZone";
import WorkspaceAiSettingsCard from "@/components/workspace/WorkspaceAiSettingsCard";
import WorkspacePreferencesCard from "@/components/workspace/WorkspacePreferencesCard";
import { isDeveloperToolsEnabled } from "@/lib/feature-flags";

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)]">
      <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">{title}</h2>
      <p className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-body)] text-r5-text-secondary">{description}</p>
      <div className="mt-[var(--r5-space-4)]">{children}</div>
    </section>
  );
}

export default function WorkspaceSettingsPage() {
  const showDeveloperTools = isDeveloperToolsEnabled();

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-[var(--r5-space-5)] pb-[var(--r5-space-4)]">
      <div>
        <Link href="/feed" className="text-[length:var(--r5-font-body)] text-r5-text-secondary transition hover:text-r5-text-primary">
          ← Feed
        </Link>
      </div>

      <SettingsSection
        title="Appearance & workspace"
        description="Themes, mesh gradients, and layout — open the full customize page for previews, or adjust time zone and locale below."
      >
        <div className="flex flex-wrap gap-[var(--r5-space-2)]">
          <Link
            href="/workspace/customize"
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/60 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
          >
            Open customization & themes
          </Link>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Time zone, locale & surfaces"
        description="Applies to greetings, digests, and auto theme boundaries. Same card as Customize — saved to your account when signed in."
      >
        <WorkspacePreferencesCard />
      </SettingsSection>

      <SettingsSection
        title="Account"
        description="Manage your profile and sign-in details."
      >
        <div className="space-y-[var(--r5-space-4)]">
          <SettingsClerkUserProfile />
          <AccountDangerZone />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Choose when you want reminders and updates."
      >
        <Link
          href="/workspace/notifications/preferences"
          className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/60 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
        >
          Open notification preferences
        </Link>
      </SettingsSection>

      <SettingsSection
        title="AI Settings"
        description="Control how commitments are generated and reviewed."
      >
        <WorkspaceAiSettingsCard />
      </SettingsSection>

      {showDeveloperTools ? (
        <SettingsSection
          title="Webhook Input"
          description="Connect external systems to send updates into Route5."
        >
          <SettingsIngestWebhookCard />
        </SettingsSection>
      ) : null}
    </div>
  );
}

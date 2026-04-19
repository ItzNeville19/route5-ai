"use client";

import Link from "next/link";
import SettingsIngestWebhookCard from "@/components/settings/SettingsIngestWebhookCard";
import SettingsClerkUserProfile from "@/components/settings/SettingsClerkUserProfile";
import AccountDangerZone from "@/components/settings/AccountDangerZone";
import WorkspaceAiSettingsCard from "@/components/workspace/WorkspaceAiSettingsCard";
import WorkspacePreferencesCard from "@/components/workspace/WorkspacePreferencesCard";

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
      className={`rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)] ${id ? "scroll-mt-28" : ""}`}
    >
      <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">{title}</h2>
      <p className="mt-[var(--r5-space-1)] text-[length:var(--r5-font-body)] text-r5-text-secondary">{description}</p>
      <div className="mt-[var(--r5-space-4)]">{children}</div>
    </section>
  );
}

export default function WorkspaceSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[960px] space-y-[var(--r5-space-5)] pb-[var(--r5-space-4)]">
      <div>
        <Link href="/feed" className="text-[length:var(--r5-font-body)] text-r5-text-secondary transition hover:text-r5-text-primary">
          ← Feed
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
        id="settings-notifications"
        title="Notifications"
        description="Choose delivery channels for updates, follow-ups, and digests."
      >
        <Link
          href="/workspace/notifications/preferences"
          className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/60 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
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
          <Link
            href="/workspace/developer"
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/60 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
          >
            Open developer webhooks and API docs
          </Link>
          <div className="grid gap-[var(--r5-space-2)] sm:grid-cols-3">
            {[
              { name: "Slack", href: "/integrations/slack" },
              { name: "Gmail", href: "/integrations/google" },
              { name: "Notion", href: "/integrations" },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-[var(--r5-space-2)] transition hover:bg-r5-surface-hover"
              >
                <p className="text-[length:var(--r5-font-body)] font-medium text-r5-text-primary">{item.name}</p>
                <p className="mt-[var(--r5-space-1)] text-[12px] text-r5-text-secondary">Open integration</p>
              </Link>
            ))}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

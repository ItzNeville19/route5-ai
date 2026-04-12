"use client";

import Link from "next/link";
import { PRODUCT_MISSION } from "@/lib/product-truth";
import WorkspacePreferencesCard from "@/components/workspace/WorkspacePreferencesCard";
import WorkspaceAiSettingsCard from "@/components/workspace/WorkspaceAiSettingsCard";
import AccountDangerZone from "@/components/settings/AccountDangerZone";
import SettingsClerkUserProfile from "@/components/settings/SettingsClerkUserProfile";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

function PlanUsageStrip() {
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  if (loadingEntitlements || !entitlements) return null;
  const max = entitlements.limits.maxProjects;
  const maxLabel = max >= 999999 ? "Unlimited" : String(max);
  const cap = entitlements.limits.maxExtractionsPerMonth;
  const capLabel = cap >= 999999 ? "Unlimited" : String(cap);
  const month = entitlements.usage.extractionsThisMonth ?? 0;
  const paid = entitlements.isPaidTier;
  return (
    <div
      className={`dashboard-home-card rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${
        paid
          ? "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-[#d9f99d]/[0.06] text-[var(--workspace-muted-fg)]"
          : "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]"
      }`}
    >
      <p className="font-semibold text-[var(--workspace-fg)]">
        <span className={paid ? "text-violet-200" : ""}>{entitlements.tierLabel}</span>
        {" · "}
        {entitlements.usage.projectCount}/{maxLabel} projects · {month}/{capLabel} extractions this month (UTC) ·{" "}
        {entitlements.usage.extractionCount} all-time
      </p>
      <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">{entitlements.tierTagline}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/account/plans" className="font-medium text-[var(--workspace-accent)] hover:underline">
          {paid ? "Manage plan" : "Upgrade"}
        </Link>
        {entitlements.features.prioritySupport ? (
          <Link
            href="/contact?subject=Priority%20support%20%28Pro%29"
            className="font-medium text-[var(--workspace-accent)] hover:underline"
          >
            Priority support
          </Link>
        ) : null}
      </p>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[960px] space-y-8 pb-4">
      <PlanUsageStrip />
      <div>
        <Link
          href="/projects"
          className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          ← Overview
        </Link>
        <h1 className="sr-only">Workspace settings</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <strong className="font-semibold text-[var(--workspace-fg)]">
            {PRODUCT_MISSION.name}
          </strong>{" "}
          — {PRODUCT_MISSION.headline}
        </p>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {PRODUCT_MISSION.boundaryNote}
        </p>
        <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Profile and sign-in below are managed by Clerk. To delete your account, use the{" "}
          <strong className="font-semibold text-[var(--workspace-fg)]">Danger zone</strong> at the bottom of this
          page — not the Account tab alone. Route5 billing and plans are on{" "}
          <Link
            href="/account/plans"
            className="font-medium text-[var(--workspace-accent)] hover:underline"
          >
            Plans
          </Link>
          .
        </p>
      </div>

      <WorkspaceAiSettingsCard />

      <WorkspacePreferencesCard />

      <SettingsClerkUserProfile />

      <AccountDangerZone />
    </div>
  );
}

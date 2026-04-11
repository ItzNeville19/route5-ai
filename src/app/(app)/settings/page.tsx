"use client";

import { UserProfile } from "@clerk/nextjs";
import { Tag } from "lucide-react";
import Link from "next/link";
import { PRODUCT_MISSION } from "@/lib/product-truth";
import WorkspacePreferencesCard from "@/components/workspace/WorkspacePreferencesCard";

export default function WorkspaceSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[960px] space-y-8 pb-4">
      <div>
        <Link
          href="/projects"
          className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          ← Projects
        </Link>
        <h1 className="sr-only">Workspace settings</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <strong className="font-semibold text-[var(--workspace-fg)]">
            {PRODUCT_MISSION.name}
          </strong>{" "}
          — {PRODUCT_MISSION.headline}
        </p>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {PRODUCT_MISSION.boundaryNote}
        </p>
        <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Account and security below are managed by Clerk. Route5 billing and plans are on{" "}
          <Link
            href="/account/plans"
            className="font-medium text-[var(--workspace-accent)] hover:underline"
          >
            Plans
          </Link>
          .
        </p>
      </div>

      <WorkspacePreferencesCard />

      <div className="overflow-hidden rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] [&_.cl-rootBox]:!w-full [&_.cl-card]:!shadow-none">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "border-0 shadow-none bg-transparent",
              navbar: "border-b border-[var(--workspace-border)]",
              navbarButton: "text-[14px]",
            },
          }}
        >
          <UserProfile.Page label="account" />
          <UserProfile.Page label="security" />
          <UserProfile.Link
            label="Route5 plans"
            url="/account/plans"
            labelIcon={<Tag className="h-4 w-4 text-[var(--workspace-muted-fg)]" aria-hidden />}
          />
        </UserProfile>
      </div>
    </div>
  );
}

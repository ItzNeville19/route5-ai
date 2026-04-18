"use client";

import Link from "next/link";
import DashboardCustomizeSection from "@/components/workspace/DashboardCustomizeSection";
import WorkspaceThemeSection from "@/components/workspace/WorkspaceThemeSection";

export default function WorkspaceCustomizePage() {
  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] pb-24">
      <div className="mb-6">
        <Link
          href="/overview"
          className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          ← Overview
        </Link>
        <h1 className="sr-only">Customize workspace</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Choose how the workspace looks, set a custom Overview subtitle, and add quick links. Preferences save to your
          account when you&apos;re signed in.{" "}
          <Link href="/marketplace" className="font-medium text-[var(--workspace-accent)] hover:underline">
            Library
          </Link>{" "}
          has every major Route5 surface in one place.
        </p>
      </div>
      <WorkspaceThemeSection />
      <DashboardCustomizeSection />
    </div>
  );
}

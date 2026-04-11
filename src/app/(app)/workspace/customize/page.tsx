"use client";

import Link from "next/link";
import DashboardCustomizeSection from "@/components/workspace/DashboardCustomizeSection";

export default function WorkspaceCustomizePage() {
  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] pb-24">
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          ← Projects
        </Link>
        <h1 className="sr-only">Customize workspace</h1>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Set your subtitle and Jump links for the overview. Preferences save to your account when you&apos;re signed in.{" "}
          <Link href="/workspace/apps" className="font-medium text-[var(--workspace-accent)] hover:underline">
            App launcher
          </Link>{" "}
          has integrations and Desk in one grid.
        </p>
      </div>
      <DashboardCustomizeSection />
    </div>
  );
}

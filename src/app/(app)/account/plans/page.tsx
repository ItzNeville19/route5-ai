import type { Metadata } from "next";
import Link from "next/link";
import AccountPlansClient from "@/components/account/AccountPlansClient";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { BILLING_LIVE } from "@/lib/plans-catalog";

export const metadata: Metadata = {
  title: "Plans & billing — Route5",
  description: "Workspace plans, limits, and upgrades for Route5 execution intelligence.",
};

export default function AccountPlansPage() {
  return (
    <WorkspaceArticle
      backHref="/projects"
      backLabel="Overview"
      kicker="Account"
      title="Plans & billing"
      intro="Plans set your workspace limits — projects and monthly extractions match your tier. Upgrade when you need more headroom."
    >
      {!BILLING_LIVE ? (
        <p className="mb-6 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Self-serve checkout is coming soon. Usage limits apply today; you will not be charged in-app until billing is enabled and you confirm.
        </p>
      ) : null}

      <AccountPlansClient />

      <p className="mt-8 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Public pricing page:{" "}
        <Link
          href="/pricing"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          route5.ai/pricing
        </Link>
        . Clerk handles authentication; plans above describe Route5 packaging only.
      </p>
    </WorkspaceArticle>
  );
}

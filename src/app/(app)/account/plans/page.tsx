import type { Metadata } from "next";
import Link from "next/link";
import AccountPlansClient from "@/components/account/AccountPlansClient";
import AdvertisingSafeHarbor from "@/components/marketing/AdvertisingSafeHarbor";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { BILLING_LIVE } from "@/lib/plans-catalog";

export const metadata: Metadata = {
  title: "Plans & billing — Route5",
  description: "Workspace plans, limits, and upgrades for Route5.",
};

export default function AccountPlansPage() {
  return (
    <WorkspaceArticle
      backHref="/workspace/dashboard"
      backLabel="Dashboard"
      kicker="Account"
      title="Plans & billing"
      intro="Plans set your workspace limits — projects and monthly captures match your tier. Upgrade when you need more headroom."
    >
      {!BILLING_LIVE ? (
        <p className="mb-6 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Self-serve checkout is coming soon. Usage limits apply today; you will not be charged in-app until billing is enabled and you confirm.
        </p>
      ) : null}

      <AdvertisingSafeHarbor variant="account" className="mb-6" />

      <AccountPlansClient />

      <p className="mt-8 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Public pricing page:{" "}
        <Link
          href="/pricing"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          route5.ai/pricing
        </Link>
        . Clerk handles authentication; plan text describes Route5 packaging, not third-party services. For binding
        terms see{" "}
        <Link href="/terms" className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline">
          Terms
        </Link>
        .
      </p>
    </WorkspaceArticle>
  );
}

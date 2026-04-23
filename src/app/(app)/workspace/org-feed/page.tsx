import { Suspense } from "react";
import type { Metadata } from "next";
import OrgCommitmentTracker from "@/components/workspace/OrgCommitmentTracker";

export const metadata: Metadata = {
  title: "Org Feed — Route5",
  description: "Live view of every commitment across your organization.",
};

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pb-24 text-[14px] text-[var(--workspace-muted-fg)]">
      Loading org feed…
    </div>
  );
}

export default function WorkspaceOrgFeedPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <OrgCommitmentTracker />
    </Suspense>
  );
}

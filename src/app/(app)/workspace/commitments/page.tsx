import { Suspense } from "react";
import type { Metadata } from "next";
import OrgCommitmentTracker from "@/components/workspace/OrgCommitmentTracker";

export const metadata: Metadata = {
  title: "Commitments — Route5",
  description: "Org-wide commitment tracker with owners, deadlines, and history.",
};

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pb-24 text-[14px] text-[var(--workspace-muted-fg)]">
      Loading commitments…
    </div>
  );
}

export default function WorkspaceCommitmentsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <OrgCommitmentTracker />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import EscalationLogPage from "@/components/workspace/EscalationLogPage";

export const metadata: Metadata = {
  title: "Escalations — Route5",
  description: "Org escalation history and filters.",
};

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pb-24 text-[14px] text-[var(--workspace-muted-fg)]">
      Loading…
    </div>
  );
}

export default function WorkspaceEscalationsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <EscalationLogPage />
    </Suspense>
  );
}

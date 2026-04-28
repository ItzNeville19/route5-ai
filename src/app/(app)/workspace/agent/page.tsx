import { Suspense } from "react";
import type { Metadata } from "next";
import AgentControlCenter from "@/components/workspace/AgentControlCenter";

export const metadata: Metadata = {
  title: "Agent — Route5",
  description: "Suggest, approve, and execute recovery actions from Route5 Agent.",
};

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pb-24 text-[14px] text-[var(--workspace-muted-fg)]">
      Loading agent…
    </div>
  );
}

export default function WorkspaceAgentPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <AgentControlCenter />
    </Suspense>
  );
}

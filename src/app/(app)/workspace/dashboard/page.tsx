import { Suspense } from "react";
import type { Metadata } from "next";
import ExecutiveDashboard from "@/components/workspace/ExecutiveDashboardNeo";

export const metadata: Metadata = {
  title: "Dashboard — Route5",
  description: "Executive execution health, trends, and team performance.",
};

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pb-24 text-[14px] text-[var(--workspace-muted-fg)]">
      Loading dashboard…
    </div>
  );
}

export default function WorkspaceDashboardPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ExecutiveDashboard />
    </Suspense>
  );
}

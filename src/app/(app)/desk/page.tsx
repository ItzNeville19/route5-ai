import { Suspense } from "react";
import type { Metadata } from "next";
import DeskWorkspace from "@/components/desk/DeskWorkspace";

export const metadata: Metadata = {
  title: "Desk — Route5",
  description: "Capture, run extractions, and jump to integrations from one surface.",
};

function DeskFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pb-24 text-[14px] text-[var(--workspace-muted-fg)]">
      Loading desk…
    </div>
  );
}

export default function DeskPage() {
  return (
    <Suspense fallback={<DeskFallback />}>
      <DeskWorkspace />
    </Suspense>
  );
}

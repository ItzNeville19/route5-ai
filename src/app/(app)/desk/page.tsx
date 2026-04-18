import { Suspense } from "react";
import type { Metadata } from "next";
import CommitmentDesk from "@/components/desk/CommitmentDesk";

export const metadata: Metadata = {
  title: "Desk — Route5",
  description:
    "Turn emails, notes, and threads into owned next steps: pick a project, paste source material, run one structured pass — saved per program with checklists and audit-friendly history.",
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
      <CommitmentDesk />
    </Suspense>
  );
}

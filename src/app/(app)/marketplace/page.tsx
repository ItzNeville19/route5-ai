import { Suspense } from "react";
import MarketplaceBrowse from "@/components/marketplace/MarketplaceBrowse";

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-[var(--workspace-muted-fg)]">
          Loading marketplace…
        </div>
      }
    >
      <MarketplaceBrowse />
    </Suspense>
  );
}

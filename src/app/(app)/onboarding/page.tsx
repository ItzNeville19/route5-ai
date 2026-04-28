"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { markOnboardingComplete } from "@/lib/onboarding-storage";
import { useUser } from "@clerk/nextjs";

/**
 * Legacy full-page wizard — replaced by in-workspace tour + Help. Never show the old flow.
 * - Default: go to Desk (and mark local onboarding complete so nothing loops).
 * - ?replay=1: jump to dashboard with guided tour query (overlay).
 */
function OnboardingRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) markOnboardingComplete(user.id);
    const replay = searchParams.get("replay") === "1";
    if (replay) {
      router.replace("/workspace/dashboard?tour=1");
      return;
    }
    router.replace("/desk");
  }, [router, searchParams, user?.id]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] text-[var(--workspace-muted-fg,#71717a)]">Continuing to your workspace…</p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingRedirectInner />
    </Suspense>
  );
}

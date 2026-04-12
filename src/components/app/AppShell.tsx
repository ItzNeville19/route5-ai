"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignIn, useAuth } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import OnboardingShell from "@/components/app/OnboardingShell";
import WorkspaceLayout from "@/components/app/WorkspaceLayout";
import { hasClerkPublishableKey } from "@/lib/clerk-env";
import { isOnboardingComplete } from "@/lib/onboarding-storage";

const clerkSignInAppearance = {
  elements: {
    rootBox: "w-full mx-auto",
    card: "shadow-xl shadow-black/[0.08] border border-black/[0.06]",
  },
} as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();

  if (!hasClerkPublishableKey()) {
    return (
      <div className="theme-glass-site flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="max-w-md text-[15px] font-medium text-[#1d1d1f]">
          Authentication isn&apos;t configured for this deployment.
        </p>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6e6e73]">
          Add{" "}
          <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[13px]">
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
          </code>{" "}
          and{" "}
          <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[13px]">
            CLERK_SECRET_KEY
          </code>{" "}
          to your environment, restart the dev server, and try again.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4 text-[14px] font-medium">
          <Link href="/" className="text-[#0071e3] hover:underline">
            Website
          </Link>
          <Link href="/product" className="text-[#0071e3] hover:underline">
            What we ship
          </Link>
          <Link href="/contact" className="text-[#0071e3] hover:underline">
            Contact
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="theme-glass-site flex min-h-dvh flex-col items-center justify-center px-6"
        aria-busy="true"
        aria-label="Loading account"
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent"
          aria-hidden
        />
        <p className="mt-5 max-w-sm text-center text-[14px] text-[#6e6e73]">
          Connecting your workspace session…
        </p>
        <p className="mt-2 max-w-md text-center text-[12px] text-[#86868b]">
          If this never finishes, check the browser console, confirm Clerk keys in{" "}
          <code className="rounded bg-black/[0.06] px-1">.env.local</code>, and
          restart <code className="rounded bg-black/[0.06] px-1">npm run dev</code>
          after fixing compile errors.
        </p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="theme-glass-site relative min-h-dvh text-[#1d1d1f]">
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[#ececee]/80 backdrop-blur-xl"
          aria-hidden
        />
        <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#a78bfa]/20 via-transparent to-[#c4b5fd]/15" />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <Navbar />
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-6 sm:px-6">
            <div className="w-full max-w-[440px] [&_.cl-rootBox]:w-full">
              <SignIn
                routing="hash"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/desk"
                signUpFallbackRedirectUrl="/onboarding"
                appearance={clerkSignInAppearance}
              />
            </div>
            <p className="mt-8 max-w-sm text-center text-[13px] leading-relaxed text-[#6e6e73]">
              Prefer the full sign-in page?{" "}
              <Link
                href="/login"
                className="font-medium text-[#0071e3] hover:underline"
              >
                Open /login
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SignedInAppShell userId={userId}>{children}</SignedInAppShell>
  );
}

function GateSpinner() {
  return (
    <div
      className="theme-agent-shell theme-route5-command flex min-h-dvh flex-col items-center justify-center bg-[var(--workspace-canvas)]"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--workspace-muted-fg)] border-t-[var(--workspace-accent)]" />
      <p className="mt-5 text-[13px] text-[var(--workspace-muted-fg)]">Preparing your workspace…</p>
    </div>
  );
}

function SignedInAppShell({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [gate, setGate] = useState<"check" | "ok" | "redirecting">("check");

  useLayoutEffect(() => {
    if (pathname === "/onboarding") {
      const replay =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("replay") === "1";
      if (isOnboardingComplete(userId) && !replay) {
        router.replace("/desk");
        setGate("redirecting");
        return;
      }
      setGate("ok");
      return;
    }
    // Onboarding is optional: never block workspace or marketplace behind the wizard.
    setGate("ok");
  }, [userId, pathname, router]);

  if (gate === "check" || gate === "redirecting") {
    return <GateSpinner />;
  }

  if (pathname === "/onboarding") {
    return <OnboardingShell>{children}</OnboardingShell>;
  }

  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}

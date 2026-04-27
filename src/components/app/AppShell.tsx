"use client";

import { useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignIn, useAuth } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import OnboardingShell from "@/components/app/OnboardingShell";
import PublicWorkspaceGuideShell from "@/components/app/PublicWorkspaceGuideShell";
import WorkspaceLayout from "@/components/app/WorkspaceLayout";
import { isPublicWorkspaceGuidePath } from "@/lib/public-site-paths";
import { useClerkRuntimeEnabled } from "@/components/providers/ClerkRuntimeProvider";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import { isOnboardingComplete } from "@/lib/onboarding-storage";

function AppShellClerkMissing() {
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
          Product
        </Link>
        <Link href="/contact" className="text-[#0071e3] hover:underline">
          Contact
        </Link>
      </div>
    </div>
  );
}

function ClerkConnectingSpinner() {
  return (
    <div
      className="theme-glass-site relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6"
      aria-busy="true"
      aria-label="Loading account"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(167,139,250,0.35),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(244,114,182,0.12),transparent_50%)]"
        aria-hidden
      />
      <div className="relative flex flex-col items-center">
        <div className="relative h-14 w-14">
          <div
            className="absolute inset-0 animate-pulse rounded-[22px] bg-gradient-to-br from-[#a78bfa]/40 via-[#c4b5fd]/25 to-[#f472b6]/20 blur-sm"
            aria-hidden
          />
          <div
            className="relative flex h-14 w-14 items-center justify-center rounded-[22px] border border-black/[0.06] bg-white/80 shadow-[0_8px_32px_-12px_rgba(99,102,241,0.35)] backdrop-blur-xl"
            aria-hidden
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0071e3]/20 border-t-[#0071e3]" />
          </div>
        </div>
        <p className="mt-8 max-w-sm text-center text-[15px] font-medium tracking-[-0.02em] text-[#1d1d1f]">
          Connecting your workspace…
        </p>
        <p className="mt-2 max-w-md text-center text-[13px] leading-relaxed text-[#6e6e73]">
          Securing your session with Clerk. This usually takes a moment.
        </p>
      </div>
    </div>
  );
}

/** Must only render when `ClerkProvider` is present (keys configured). */
function AppShellWithClerk({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();

  if (!isLoaded) {
    return <ClerkConnectingSpinner />;
  }

  if (!userId && isPublicWorkspaceGuidePath(pathname)) {
    return <PublicWorkspaceGuideShell>{children}</PublicWorkspaceGuideShell>;
  }

  if (!userId) {
    return (
      <div className="auth-route5-shell relative min-h-dvh">
        <div className="relative z-10 flex min-h-dvh flex-col">
          <Navbar />
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-6 sm:px-6">
            <div className="w-full max-w-[440px] [&_.cl-rootBox]:w-full">
              <SignIn
                routing="path"
                path="/login"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/desk"
                signUpFallbackRedirectUrl="/onboarding"
                appearance={{
                  ...route5ClerkAppearance,
                  elements: {
                    ...route5ClerkAppearance.elements,
                    rootBox: "w-full mx-auto",
                  },
                }}
              />
            </div>
            <p className="mt-8 max-w-sm text-center text-[13px] leading-relaxed text-neutral-500">
              Prefer the full sign-in page?{" "}
              <Link href="/login" className="font-medium text-white hover:underline">
                Open /login
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <SignedInAppShell userId={userId}>{children}</SignedInAppShell>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const clerkRuntimeOk = useClerkRuntimeEnabled();
  if (!clerkRuntimeOk) {
    return <AppShellClerkMissing />;
  }
  return <AppShellWithClerk>{children}</AppShellWithClerk>;
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

  /** Client onboarding route: bounce to Desk when already done (unless replaying tutorial). */
  useLayoutEffect(() => {
    if (pathname !== "/onboarding") return;
    const replay =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("replay") === "1";
    if (isOnboardingComplete(userId) && !replay) {
      router.replace("/desk");
    }
  }, [userId, pathname, router]);

  // Keep workspace stable: onboarding is rendered inline in empty states, not as an auto-redirect overlay.

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;
    router.replace(`/invite/${encodeURIComponent(token)}`);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const deviceKey = [
      navigator.userAgent || "ua",
      navigator.platform || "platform",
      navigator.language || "lang",
    ].join("|");
    const guardKey = `route5:login-alert:${userId}:${deviceKey}`;
    if (window.localStorage.getItem(guardKey) === "1") return;
    window.localStorage.setItem(guardKey, "1");
    void fetch("/api/notifications/login-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        userAgent: navigator.userAgent ?? "",
        platform: navigator.platform ?? "",
      }),
    }).catch(() => {
      /* non-fatal */
    });
  }, [userId]);

  if (pathname === "/onboarding") {
    return <OnboardingShell>{children}</OnboardingShell>;
  }

  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}

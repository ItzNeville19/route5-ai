"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import { hasClerkPublishableKey } from "@/lib/clerk-env";
import { deskUrl } from "@/lib/desk-routes";
import { isOnboardingComplete } from "@/lib/onboarding-storage";

const DESK_HREF = deskUrl();

function SignUpClerkMissing() {
  return (
    <div className="theme-glass-site min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 pb-24 pt-32 text-center">
        <p className="text-[15px] font-medium text-[#1d1d1f]">
          Clerk is not configured — add keys in{" "}
          <code className="rounded bg-black/[0.06] px-1">.env.local</code>
        </p>
        <Link href="/login" className="mt-6 text-[14px] font-medium text-[#0071e3] hover:underline">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}

function SignUpWithClerk() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !userId) return;
    const next = isOnboardingComplete(userId) ? DESK_HREF : "/onboarding";
    router.replace(next);
  }, [isLoaded, userId, router]);

  if (userId && isLoaded) {
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="theme-glass-site min-h-dvh">
        <Navbar />
        <div className="mx-auto flex min-h-[min(60vh,480px)] max-w-[480px] flex-col items-center justify-center px-4 pt-28">
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent"
            aria-hidden
          />
          <p className="mt-4 text-[13px] text-[#6e6e73]">Preparing sign-up…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-glass-site min-h-dvh">
      <Navbar />
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-4 pb-20 pt-24 sm:pt-28">
        <p className="mb-6 text-center">
          <Link
            href="/"
            className="text-[13px] font-medium text-[#6e6e73] underline-offset-4 transition hover:text-[#0071e3] hover:underline"
          >
            ← Back to Route5
          </Link>
        </p>
        <div className="flex w-full min-h-[420px] justify-center [&_.cl-rootBox]:w-full [&_.cl-rootBox]:max-w-[420px]">
          <SignUp
            routing="hash"
            signInUrl="/login"
            fallbackRedirectUrl="/onboarding"
            signInFallbackRedirectUrl={DESK_HREF}
            appearance={{
              elements: {
                rootBox: "w-full mx-auto max-w-[420px]",
              },
            }}
          />
        </div>
        <p className="mt-8 text-center text-[13px] text-[#86868b]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#0071e3] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  if (!hasClerkPublishableKey()) {
    return <SignUpClerkMissing />;
  }
  return <SignUpWithClerk />;
}

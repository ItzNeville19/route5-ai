"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import { WORKSPACE_HOME_HREF } from "@/lib/app-routes";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import { isOnboardingComplete } from "@/lib/onboarding-storage";

function SignUpClerkMissing() {
  return (
    <div className="auth-route5-shell min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 pb-24 pt-32 text-center">
        <p className="text-[15px] font-medium text-neutral-200">
          Clerk is not fully configured — add{" "}
          <code className="rounded bg-white/10 px-1 text-white">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
          <code className="rounded bg-white/10 px-1 text-white">CLERK_SECRET_KEY</code>
        </p>
        <Link href="/login" className="mt-6 text-[14px] font-medium text-white hover:underline">
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
    const next = isOnboardingComplete(userId) ? WORKSPACE_HOME_HREF : "/onboarding";
    router.replace(next);
  }, [isLoaded, userId, router]);

  if (userId && isLoaded) {
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="auth-route5-shell min-h-dvh">
        <Navbar />
        <div className="mx-auto flex min-h-[min(60vh,480px)] max-w-[480px] flex-col items-center justify-center px-4 pt-28">
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-hidden
          />
          <p className="mt-4 text-[13px] text-neutral-400">Preparing sign-up…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-route5-shell min-h-dvh">
      <Navbar />
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-4 pb-20 pt-24 sm:pt-28">
        <p className="mb-6 text-center">
          <Link
            href="/"
            className="text-[13px] font-medium text-neutral-400 underline-offset-4 transition hover:text-white hover:underline"
          >
            ← Back to Route5
          </Link>
        </p>
        <div className="flex w-full min-h-[420px] justify-center [&_.cl-rootBox]:w-full [&_.cl-rootBox]:max-w-[420px]">
          <SignUp
            routing="hash"
            signInUrl="/login"
            fallbackRedirectUrl="/onboarding"
            signInFallbackRedirectUrl={WORKSPACE_HOME_HREF}
            appearance={{
              ...route5ClerkAppearance,
              elements: {
                ...route5ClerkAppearance.elements,
                rootBox: "w-full mx-auto max-w-[420px]",
              },
            }}
          />
        </div>
        <p className="mt-8 text-center text-[13px] text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPageClient({ clerkRuntimeOk }: { clerkRuntimeOk: boolean }) {
  if (!clerkRuntimeOk) {
    return <SignUpClerkMissing />;
  }
  return <SignUpWithClerk />;
}

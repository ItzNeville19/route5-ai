"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { WORKSPACE_HOME_HREF } from "@/lib/app-routes";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import { isOnboardingComplete } from "@/lib/onboarding-storage";

function closeMobileNavFromLogin() {
  window.dispatchEvent(new CustomEvent("close-site-mobile-nav"));
}

function LoginClerkMissing() {
  return (
    <div className="theme-glass-site min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 pb-24 pt-32 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
          Environment
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
          Sign-in isn&apos;t configured on this deployment
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#6e6e73]">
          Add both Clerk keys (publishable + secret). For local standalone builds, load env from the project
          root or set variables in your host.
        </p>
        <div className="glass-surface mt-8 w-full rounded-2xl px-5 py-4 text-left text-[13px] leading-relaxed text-[#1d1d1f]">
          <p className="font-mono text-[11px] text-[#86868b]">.env.local</p>
          <p className="mt-2">
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>
          </p>
          <p className="mt-2">
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5">CLERK_SECRET_KEY</code>
          </p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-4 text-[14px]">
          <Link href="/" className="font-medium text-[#0071e3] hover:underline">
            ← Website
          </Link>
          <Link href="/product" className="font-medium text-[#0071e3] hover:underline">
            What we ship
          </Link>
          <Link href="/contact" className="font-medium text-[#0071e3] hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginWithClerk() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [signedOutBanner, setSignedOutBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("signedOut") === "1") setSignedOutBanner(true);
  }, []);

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
          <p className="mt-4 text-[13px] text-neutral-400">Preparing sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-route5-shell min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-[480px] flex-col px-4 pb-[max(5rem,calc(1.25rem+env(safe-area-inset-bottom,0px)))] pt-24 sm:pt-28">
        {signedOutBanner ? (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-left text-[13px] leading-relaxed text-neutral-200"
          >
            <p className="font-semibold text-white">Signed out</p>
            <p className="mt-1 text-neutral-400">
              Your workspace session ended. Sign in again to continue where you left off.
            </p>
            <button
              type="button"
              onClick={() => setSignedOutBanner(false)}
              className="mt-2 text-[12px] font-medium text-white underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <p className="mb-6 text-center">
          <Link
            href="/"
            className="text-[13px] font-medium text-neutral-400 underline-offset-4 transition hover:text-white hover:underline"
          >
            ← Back to Route5
          </Link>
        </p>
        <div className="flex w-full min-h-[420px] justify-center [&_.cl-rootBox]:w-full [&_.cl-rootBox]:max-w-[420px]">
          <SignIn
            routing="hash"
            signUpUrl="/sign-up"
            fallbackRedirectUrl={WORKSPACE_HOME_HREF}
            signUpFallbackRedirectUrl={WORKSPACE_HOME_HREF}
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
          New here?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-white hover:underline"
            onClick={closeMobileNavFromLogin}
          >
            Create an account
          </Link>
          {" · "}
          <Link
            href="/product"
            className="font-medium text-white/90 hover:underline"
            onClick={closeMobileNavFromLogin}
          >
            Read what we ship
          </Link>{" "}
          before you paste production text.
        </p>
      </div>
    </div>
  );
}

export default function LoginPageClient({ clerkRuntimeOk }: { clerkRuntimeOk: boolean }) {
  if (!clerkRuntimeOk) {
    return <LoginClerkMissing />;
  }
  return <LoginWithClerk />;
}

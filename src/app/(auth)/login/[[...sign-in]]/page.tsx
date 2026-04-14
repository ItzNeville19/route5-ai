"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { deskUrl } from "@/lib/desk-routes";
import { isOnboardingComplete } from "@/lib/onboarding-storage";

const DESK_HREF = deskUrl();

function hasClerkKey() {
  return Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}

function closeMobileNavFromLogin() {
  window.dispatchEvent(new CustomEvent("close-site-mobile-nav"));
}

export default function LoginPage() {
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
    const next = isOnboardingComplete(userId) ? DESK_HREF : "/onboarding";
    router.replace(next);
  }, [isLoaded, userId, router]);

  if (!hasClerkKey()) {
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
            This is not a product bug — add Clerk keys and restart the dev server.
            Your team uses the same shell as production once keys are present.
          </p>
          <div className="glass-surface mt-8 w-full rounded-2xl px-5 py-4 text-left text-[13px] leading-relaxed text-[#1d1d1f]">
            <p className="font-mono text-[11px] text-[#86868b]">.env.local</p>
            <p className="mt-2">
              <code className="rounded bg-black/[0.05] px-1.5 py-0.5">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              </code>
            </p>
            <p className="mt-2">
              <code className="rounded bg-black/[0.05] px-1.5 py-0.5">
                CLERK_SECRET_KEY
              </code>
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-[14px]">
            <Link
              href="/"
              className="font-medium text-[#0071e3] hover:underline"
            >
              ← Website
            </Link>
            <Link
              href="/product"
              className="font-medium text-[#0071e3] hover:underline"
            >
              What we ship
            </Link>
            <Link
              href="/contact"
              className="font-medium text-[#0071e3] hover:underline"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="mt-4 text-[13px] text-[#6e6e73]">Preparing sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-glass-site min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-[480px] flex-col px-4 pb-20 pt-24 sm:pt-28">
        {signedOutBanner ? (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-[#0071e3]/25 bg-[#0071e3]/8 px-4 py-3 text-left text-[13px] leading-relaxed text-[#1d1d1f]"
          >
            <p className="font-semibold text-[#0071e3]">Signed out</p>
            <p className="mt-1 text-[#6e6e73]">
              Your workspace session ended. Sign in again to continue where you left off.
            </p>
            <button
              type="button"
              onClick={() => setSignedOutBanner(false)}
              className="mt-2 text-[12px] font-medium text-[#0071e3] underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <p className="mb-6 text-center">
          <Link
            href="/"
            className="text-[13px] font-medium text-[#6e6e73] underline-offset-4 transition hover:text-[#0071e3] hover:underline"
          >
            ← Back to Route5
          </Link>
        </p>
        {/* Hash routing avoids blank embeds when path + catch-all sync fails; still uses Clerk’s UI. */}
        <div className="flex w-full min-h-[420px] justify-center [&_.cl-rootBox]:w-full [&_.cl-rootBox]:max-w-[420px]">
          <SignIn
            routing="hash"
            signUpUrl="/sign-up"
            fallbackRedirectUrl={DESK_HREF}
            signUpFallbackRedirectUrl={DESK_HREF}
            appearance={{
              elements: {
                rootBox: "w-full mx-auto max-w-[420px]",
              },
            }}
          />
        </div>
        <p className="mt-8 text-center text-[13px] text-[#86868b]">
          New here?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-[#0071e3] hover:underline"
            onClick={closeMobileNavFromLogin}
          >
            Create an account
          </Link>
          {" · "}
          <Link
            href="/product"
            className="font-medium text-[#0071e3] hover:underline"
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

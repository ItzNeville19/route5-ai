import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PRODUCT_LIVE, PRODUCT_ROADMAP } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "Pricing — Route5",
  description:
    "How Route5 is offered today: workspace access with honest limits. Enterprise options by conversation.",
};

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <main className="theme-glass-site relative min-h-screen">
      <Navbar />
      <div className="container-apple pb-24 pt-28 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45">
            Pricing
          </p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
            Straightforward access
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#6e6e73]">
            Route5 is built for teams that need structured intelligence from text — not
            a bloated suite. What you get today is exactly what we describe on{" "}
            <Link href="/pitch" className="font-medium text-[#0071e3] hover:underline">
              What we ship
            </Link>
            ; roadmap items stay labeled separately.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-[920px] gap-6 md:grid-cols-2">
          <div className="glass-liquid glass-liquid-interactive rounded-3xl p-8 text-left">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
              Workspace
            </p>
            <p className="mt-2 text-[15px] font-semibold text-[#1d1d1f]">
              Included with your account
            </p>
            <ul className="mt-5 space-y-3 text-[14px] leading-relaxed text-[#6e6e73]">
              <li>{PRODUCT_LIVE.auth}</li>
              <li>{PRODUCT_LIVE.projects}</li>
              <li>{PRODUCT_LIVE.extract}</li>
              <li>{PRODUCT_LIVE.linear}</li>
              <li>{PRODUCT_LIVE.github}</li>
              <li>{PRODUCT_LIVE.actions}</li>
              <li>{PRODUCT_LIVE.limits}</li>
              <li>{PRODUCT_LIVE.data}</li>
            </ul>
            <div className="mt-8">
              {userId ? (
                <Link
                  href="/projects"
                  className="btn-primary inline-flex rounded-full px-6 py-2.5 text-[14px] font-semibold"
                >
                  Open workspace
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="btn-primary inline-flex rounded-full px-6 py-2.5 text-[14px] font-semibold"
                >
                  Create account
                </Link>
              )}
            </div>
          </div>

          <div className="glass-liquid rounded-3xl p-8 text-left">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
              Enterprise & volume
            </p>
            <p className="mt-2 text-[15px] font-semibold text-[#1d1d1f]">
              By conversation
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#6e6e73]">
              For procurement, security review, SSO beyond defaults, or deployment
              expectations beyond the current product surface — we scope honestly after a
              short intro.
            </p>
            <ul className="mt-5 space-y-2 text-[13px] text-[#6e6e73]">
              {PRODUCT_ROADMAP.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-[#c4c4c9]">—</span>
                  <span>Roadmap: {line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex rounded-full border border-black/[0.12] bg-white/70 px-6 py-2.5 text-[14px] font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-white"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-lg text-center text-[13px] leading-relaxed text-[#86868b]">
          No hidden per-seat surprises in the product UI — if billing changes as we add
          commercial packaging, we&apos;ll publish it here and in-app before it applies
          to you.
        </p>
      </div>
      <Footer />
    </main>
  );
}

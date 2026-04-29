import type { Metadata } from "next";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketingPublicShell from "@/components/marketing/MarketingPublicShell";
import PublicPlansGrid from "@/components/marketing/PublicPlansGrid";
import { PRICING_INTRO, TRIAL_BODY } from "@/lib/marketing-copy";

export const metadata: Metadata = {
  title: "Pricing — Route5",
  description:
    "Route5 plans are scoped per organization: trial first, then seats, integrations, and security. 14-day trial, no card—contact us to continue after trial.",
};

/** Clerk `auth()` reads request headers; must not be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const userId = await getAuthUserIdSafe();

  return (
    <MarketingPublicShell>
      <Navbar />
      <div className="container-apple relative z-10 pb-24 pt-28 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Pricing
          </p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-[-0.03em] text-white">
            Plans built around how your org buys software
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-zinc-200">
            {PRICING_INTRO}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-zinc-300">
            {TRIAL_BODY}
          </p>
        </div>

        <PublicPlansGrid signedIn={Boolean(userId)} />
      </div>
      <div className="relative z-10">
        <Footer tone="command" />
      </div>
    </MarketingPublicShell>
  );
}

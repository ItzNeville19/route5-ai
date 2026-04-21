import type { Metadata } from "next";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicPlansGrid from "@/components/marketing/PublicPlansGrid";

export const metadata: Metadata = {
  title: "Pricing — Route5",
  description:
    "Enterprise Route5 pricing is offered through direct sales conversations.",
};

/** Clerk `auth()` reads request headers; must not be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const userId = await getAuthUserIdSafe();

  return (
    <main className="route5-brand-dark-marketing-shell theme-route5-command theme-agent-shell relative min-h-screen text-zinc-100">
      <Navbar />
      <div className="container-apple relative z-10 pb-24 pt-28 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Pricing
          </p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-[-0.03em] text-white">
            Contact us for enterprise pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-zinc-300">
            Route5 is for teams that treat execution as a strategic advantage. We tailor pricing to
            your organization, rollout scope, and support model.
          </p>
        </div>

        <PublicPlansGrid signedIn={Boolean(userId)} />
      </div>
      <div className="relative z-10">
        <Footer tone="command" />
      </div>
    </main>
  );
}

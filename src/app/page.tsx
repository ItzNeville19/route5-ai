import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeSessionBar from "@/components/marketing/HomeSessionBar";
import MarketingHomeClient from "@/components/marketing/MarketingHomeClient";
import { barlowCondensedLanding, outfitLanding } from "@/lib/fonts-landing";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Route5 | Who owns what, and when it is due",
  description:
    "Route5 is the workspace where tasks, owners, and deadlines stay tied to real companies—not lost in chat. Try it free; talk to us for enterprise rollout.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getAuthUserIdSafe();

  return (
    <main
      className={`theme-route5-command theme-agent-shell landing-premium landing-fortune relative min-h-dvh text-[var(--workspace-fg)] ${outfitLanding.className} ${barlowCondensedLanding.variable}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="agent-canvas min-h-dvh">
        <Navbar />
        {userId ? <HomeSessionBar /> : null}

        <MarketingHomeClient />

        <div id="contact" className="scroll-mt-24" aria-hidden />
        <Footer tone="command" />
      </div>
    </main>
  );
}

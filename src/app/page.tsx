import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeSessionBar from "@/components/marketing/HomeSessionBar";
import MarketingHomeClient from "@/components/marketing/MarketingHomeClient";
import { barlowCondensedLanding, outfitLanding } from "@/lib/fonts-landing";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Route5 | Execution clarity for teams that ship under scrutiny",
  description:
    "System of record for decisions and commitments—owners, deadlines, execution health. Not team-chat theater. 14-day trial, no card; contact us to continue.",
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

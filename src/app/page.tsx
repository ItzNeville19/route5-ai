import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeSessionBar from "@/components/marketing/HomeSessionBar";
import MarketingHomeClient from "@/components/marketing/MarketingHomeClient";
import { barlowCondensedLanding, outfitLanding } from "@/lib/fonts-landing";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";
import { redirect } from "next/navigation";
import { POSITIONING_WEDGE } from "@/lib/positioning-wedge";
import { TRIAL_SUBLINE } from "@/lib/marketing-copy";

export const metadata: Metadata = {
  title: "Route5 | Execution layer — decisions to owned commitments",
  description: `${POSITIONING_WEDGE.taglineShort} ${TRIAL_SUBLINE}`,
};

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await getAuthUserIdSafe();
  const sp = await searchParams;
  const raw = sp.site;
  const site = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const bypassToMarketing = site === "1" || site === "marketing";

  if (userId && !bypassToMarketing) {
    redirect("/workspace/dashboard");
  }

  return (
    <main
      className={`marketing-sf-chrome relative min-h-dvh bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 text-slate-900 antialiased ${outfitLanding.className} ${barlowCondensedLanding.variable}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="min-h-dvh pb-[max(0px,env(safe-area-inset-bottom))]">
        <Navbar />
        {userId ? <HomeSessionBar /> : null}

        <MarketingHomeClient signedIn={!!userId} />

        <Footer tone="light" />
      </div>
    </main>
  );
}

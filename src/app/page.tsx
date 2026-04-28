import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeSessionBar from "@/components/marketing/HomeSessionBar";
import MarketingHomeClient from "@/components/marketing/MarketingHomeClient";
import { barlowCondensedLanding, outfitLanding } from "@/lib/fonts-landing";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Route5 | Companies, tasks, and owners in one calm workspace",
  description:
    "Turn notes into owned tasks, run a real task tracker, and give every role the right view—without building another chat app. 14-day trial, no card.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getAuthUserIdSafe();
  if (userId) {
    redirect("/workspace/dashboard");
  }

  return (
    <main
      className={`marketing-sf-chrome relative min-h-dvh bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 text-slate-900 antialiased ${outfitLanding.className} ${barlowCondensedLanding.variable}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="min-h-dvh">
        <Navbar />
        {userId ? <HomeSessionBar /> : null}

        <MarketingHomeClient signedIn={!!userId} />

        <Footer tone="light" />
      </div>
    </main>
  );
}

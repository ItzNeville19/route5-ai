import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketingPublicShell from "@/components/marketing/MarketingPublicShell";

export const metadata: Metadata = {
  title: "Careers — Route5",
  description: "Build structured intelligence with Route5.",
};

export default function CareersPage() {
  return (
    <MarketingPublicShell>
      <Navbar />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-28 md:px-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Team</p>
        <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight text-white">Careers</h1>
        <p className="mt-6 text-[17px] leading-relaxed text-zinc-300">
          We hire for craft, judgment, and curiosity. Open roles will be listed here; until then, introduce yourself via{" "}
          <Link href="/contact" className="font-medium text-sky-400 underline-offset-4 hover:underline">
            Contact
          </Link>{" "}
          with your portfolio or GitHub and what you want to build.
        </p>
      </div>
      <Footer tone="command" />
    </MarketingPublicShell>
  );
}

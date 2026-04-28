import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { outfitLanding, sourceSerifEditorial } from "@/lib/fonts-landing";
import { AboutCeoLetterContent } from "./AboutCeoLetterContent";

export const metadata: Metadata = {
  title: "Founder letter — Neville Engineer | Route5",
  description:
    "Letter from Neville Engineer, Founder and CEO of Route5 AI — Pittsford, New York.",
};

export default function AboutCeoPage() {
  return (
    <main
      className={`route5-brand-marketing-page theme-glass-site relative min-h-screen ${outfitLanding.variable} ${sourceSerifEditorial.variable}`}
    >
      <Navbar />
      <article
        className={`about-ceo-letter relative z-10 mx-auto max-w-[min(100%,72ch)] px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[calc(5.25rem+env(safe-area-inset-top))] sm:px-8 md:px-10 md:pb-28 md:pt-[calc(5.75rem+env(safe-area-inset-top))] ${sourceSerifEditorial.className}`}
      >
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45 ${outfitLanding.className}`}
        >
          Founder letter
        </p>
        <h1
          className={`mt-3 text-[clamp(1.85rem,4.2vw,2.35rem)] font-semibold tracking-[-0.035em] text-[#1d1d1f] ${outfitLanding.className}`}
        >
          Neville Engineer
        </h1>
        <p
          className={`mt-1 text-[15px] font-medium text-[#6e6e73] ${outfitLanding.className}`}
        >
          Founder & CEO, Route5 AI
        </p>
        <div className="mt-12">
          <AboutCeoLetterContent />
        </div>
      </article>
      <Footer tone="light" />
    </main>
  );
}

import Navbar from "@/components/Navbar";
import HomeSimpleExplain from "@/components/HomeSimpleExplain";
import HomeProductShowcase from "@/components/HomeProductShowcase";
import Footer from "@/components/Footer";
import LandingHero from "@/components/marketing/LandingHero";
import { outfitLanding } from "@/lib/fonts-landing";

/** Marketing home — Feed, Capture, Overview, and product scope; no fabricated metrics. */
export default function Home() {
  return (
    <main
      className={`theme-route5-command theme-agent-shell landing-premium relative min-h-dvh text-[var(--workspace-fg)] ${outfitLanding.className}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="agent-canvas min-h-dvh">
        <Navbar />
        <LandingHero />
        <HomeSimpleExplain />
        <HomeProductShowcase />
        <div id="contact" className="scroll-mt-24" aria-hidden />
        <Footer tone="command" />
      </div>
    </main>
  );
}

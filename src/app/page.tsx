import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HomeSimpleExplain from "@/components/HomeSimpleExplain";
import HomeProductShowcase from "@/components/HomeProductShowcase";
import Footer from "@/components/Footer";

/** Same command canvas + mesh as signed-in workspace — marketing matches the product shell. */
export default function Home() {
  return (
    <main className="theme-route5-command theme-agent-shell relative min-h-dvh text-[var(--workspace-fg)]">
      <div className="agent-canvas min-h-dvh">
        <Navbar />
        <Hero commandTheme />
        <HomeSimpleExplain />
        <HomeProductShowcase />
        <Footer tone="command" />
      </div>
    </main>
  );
}

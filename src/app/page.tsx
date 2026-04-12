import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HomeProductShowcase from "@/components/HomeProductShowcase";
import ProductStrip from "@/components/ProductStrip";
import HomeContact from "@/components/HomeContact";
import Footer from "@/components/Footer";

/** Same command canvas + mesh as signed-in workspace — marketing matches the product shell. */
export default function Home() {
  return (
    <main className="theme-route5-command theme-agent-shell relative min-h-dvh text-[var(--workspace-fg)]">
      <div className="agent-canvas min-h-dvh">
        <Navbar />
        <Hero commandTheme />
        <HomeProductShowcase />
        <ProductStrip tone="command" />
        <HomeContact tone="command" />
        <Footer tone="command" />
      </div>
    </main>
  );
}

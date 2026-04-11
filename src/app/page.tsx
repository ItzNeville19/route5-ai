import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProductStrip from "@/components/ProductStrip";
import HomeContact from "@/components/HomeContact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="theme-glass-site relative min-h-screen">
      <Navbar />
      <Hero />
      <ProductStrip />
      <HomeContact />
      <Footer />
    </main>
  );
}

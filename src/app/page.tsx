import Navbar        from "@/components/Navbar";
import Hero          from "@/components/Hero";
import TrustBar      from "@/components/TrustBar";
import Interstitial  from "@/components/Interstitial";
import Problem       from "@/components/Problem";
import Solution      from "@/components/Solution";
import Architecture  from "@/components/Architecture";
import Features      from "@/components/Features";
import Security      from "@/components/Security";
import Metrics       from "@/components/Metrics";
import Testimonials  from "@/components/Testimonials";
import Credibility   from "@/components/Credibility";
import BriefingProcess from "@/components/BriefingProcess";
import CTA           from "@/components/CTA";
import Contact       from "@/components/Contact";
import Footer        from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <TrustBar />
      <Interstitial />
      <Problem />
      <Solution />
      <Architecture />
      <Features />
      <Security />
      <Metrics />
      <Testimonials />
      <Credibility />
      <BriefingProcess />
      <CTA />
      <Contact />
      <Footer />
    </main>
  );
}

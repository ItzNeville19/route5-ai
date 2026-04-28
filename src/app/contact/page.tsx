import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact — Route5",
  description: "Reach the Route5 team for a briefing or workspace walkthrough.",
};

export default function ContactPage() {
  return (
    <main className="route5-brand-dark-marketing-shell relative min-h-dvh w-full bg-[#09090f] text-zinc-100 antialiased">
      <Navbar />
      <div className="relative z-10 pb-16 pt-24 md:pb-24 md:pt-28">
        <ContactForm />
      </div>
      <Footer tone="command" />
    </main>
  );
}

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
    <main className="route5-brand-dark-marketing-shell theme-route5-command theme-agent-shell relative min-h-screen text-zinc-100">
      <Navbar />
      <div className="relative z-10 pb-16 pt-24 md:pb-24 md:pt-28">
        <ContactForm />
      </div>
      <Footer tone="command" />
    </main>
  );
}

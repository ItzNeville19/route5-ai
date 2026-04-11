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
    <main className="theme-glass-site relative min-h-screen">
      <Navbar />
      <div className="pb-16 pt-24 md:pb-24 md:pt-28">
        <ContactForm />
      </div>
      <Footer />
    </main>
  );
}

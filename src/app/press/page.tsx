import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Press — Route5",
  description: "News and announcements from Route5.",
};

export default function PressPage() {
  return (
    <main className="route5-brand-marketing-page theme-glass-site relative min-h-screen">
      <Navbar />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-28 md:px-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Newsroom</p>
        <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight text-white">Press</h1>
        <p className="mt-6 text-[17px] leading-relaxed text-zinc-300">
          Wire releases, launch notes, and media kits will live here. Until then, journalists and analysts can reach us
          through{" "}
          <Link href="/contact" className="font-medium text-sky-400 underline-offset-4 hover:underline">
            Contact
          </Link>{" "}
          with “Press” in the subject line.
        </p>
      </div>
      <Footer tone="command" />
    </main>
  );
}

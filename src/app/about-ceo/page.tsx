import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About the CEO — Route5",
  description: "Leadership and mission behind Route5 — structured intelligence for teams.",
};

export default function AboutCeoPage() {
  return (
    <main className="route5-brand-marketing-page theme-glass-site relative min-h-screen">
      <Navbar />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-28 md:px-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Company</p>
        <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight text-white">
          About the CEO
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-zinc-300">
          Route5 is built for operators who need commitments, visibility, and calm execution — not another noisy feed.
          This page is a living stub for bios, press angles, and founder narrative; replace with your canonical story and
          photography when ready.
        </p>
        <p className="mt-6 text-[15px] leading-relaxed text-zinc-400">
          For partnerships or interviews, start at{" "}
          <Link href="/contact" className="font-medium text-sky-400 underline-offset-4 hover:underline">
            Contact
          </Link>
          .
        </p>
      </div>
      <Footer tone="command" />
    </main>
  );
}

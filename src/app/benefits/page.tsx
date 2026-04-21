import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CONTACT_EMAIL, mailtoHref } from "@/lib/site";

const BENEFITS = [
  {
    title: "One place to run execution",
    body: "Desk is the default workspace so managers and teams stop jumping between views to find what matters right now.",
  },
  {
    title: "Capture that does not lose work",
    body: "Drafts and generated tasks stay available while you move across tabs, so decisions turn into commitments without rework.",
  },
  {
    title: "Employee-first accountability",
    body: "Work stays grouped by owner and visible by assignee, which makes follow-through clear without noisy status theater.",
  },
  {
    title: "Signals your team can trust",
    body: "Welcome emails, digests, and product updates keep stakeholders aligned on progress and value over time.",
  },
];

export const metadata: Metadata = {
  title: "Benefits — Route5.ai",
  description:
    "Why teams use Route5: clearer ownership, reliable capture, and a desk-first execution workflow.",
};

export default function BenefitsPage() {
  return (
    <main className="route5-brand-marketing-page theme-glass-site relative min-h-screen">
      <Navbar />
      <article className="relative z-10 mx-auto max-w-[860px] px-5 pb-24 pt-28 md:px-8 md:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45">
          Route5 · benefits
        </p>
        <h1 className="mt-4 text-[clamp(1.9rem,4.7vw,2.8rem)] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
          Stay small enough long enough, then scale with control.
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
          Teams pay for outcomes, not dashboards. Route5 is built so commitments stay owned,
          visible, and easy to execute every day.
        </p>

        <section className="mt-10 grid gap-4">
          {BENEFITS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/[0.08] bg-white/80 px-5 py-5 backdrop-blur"
            >
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                {item.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-black/[0.08] bg-black/[0.02] px-5 py-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Continue after trial
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#1d1d1f]">
            Every workspace gets a 3-day free trial with no card required. After that, contact us
            to continue on the right plan.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={mailtoHref("Route5 — Continue after trial")}
              className="btn-primary inline-flex rounded-full px-6 py-3 text-[14px] font-semibold"
            >
              Contact {CONTACT_EMAIL}
            </a>
            <Link
              href="/desk"
              className="inline-flex items-center rounded-full border border-black/[0.12] bg-white/80 px-6 py-3 text-[14px] font-medium text-[#1d1d1f] transition hover:bg-white"
            >
              Open Desk
            </Link>
          </div>
        </section>
      </article>
      <Footer />
    </main>
  );
}

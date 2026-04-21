import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import Footer from "@/components/Footer";
import { outfitLanding } from "@/lib/fonts-landing";

const HomeDashboardShowcase = dynamic(
  () => import("@/components/marketing/HomeDashboardShowcase"),
  {
    loading: () => (
      <div
        className="min-h-[260px] rounded-2xl border border-white/[0.08] bg-[#0c0c0e]/60"
        aria-busy="true"
        aria-label="Loading product preview"
      />
    ),
  }
);

const HomeExecutiveInteractive = dynamic(
  () => import("@/components/marketing/HomeExecutiveInteractive"),
  {
    loading: () => (
      <div
        className="min-h-[320px] rounded-[22px] border border-white/[0.08] bg-[#0c0c0e]/60"
        aria-busy="true"
        aria-label="Loading audience and FAQ"
      />
    ),
  }
);

const PILLARS = [
  {
    title: "Ownership",
    body: "Every decision maps to a person and a date—no orphan bullets.",
  },
  {
    title: "Signal",
    body: "Leadership sees drift and load without status meetings.",
  },
  {
    title: "Continuity",
    body: "One system of record across Slack, email, docs, and projects.",
  },
] as const;

export default function Home() {
  return (
    <main
      className={`theme-route5-command theme-agent-shell landing-premium relative min-h-dvh text-[var(--workspace-fg)] ${outfitLanding.className}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="agent-canvas min-h-dvh">
        <Navbar />

        <section
          id="hero"
          className="relative overflow-hidden border-b border-white/10 pb-16 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:pb-24 sm:pt-32"
        >
          <div className="route5-landing-hero-mesh pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_-30%,rgba(56,189,248,0.14),transparent),radial-gradient(circle_at_100%_60%,rgba(99,102,241,0.09),transparent_45%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(251,191,36,0.06),transparent)]" />
          <div className="relative mx-auto max-w-[1040px] px-4 sm:px-8 lg:px-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Enterprise execution
            </p>
            <h1 className="mt-5 max-w-[18ch] text-balance text-[clamp(2.1rem,7vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-white [text-shadow:0_2px_48px_rgba(0,0,0,0.45)] sm:max-w-none">
              Accountability for every decision.
            </h1>
            <p className="mt-5 max-w-[34rem] text-pretty text-[clamp(1.02rem,2vw,1.125rem)] leading-[1.5] text-zinc-400">
              System of record for commitments—not chat summaries. Capture decisions, enforce owners and deadlines,
              and give operators a live view of execution health.
            </p>
            <div className="mt-9 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/sign-up"
                className="route5-brand-lift-card inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-[#0071e3] px-8 text-[15px] font-semibold text-white shadow-[0_8px_32px_-8px_rgba(0,113,227,0.55)] ring-1 ring-white/15 transition hover:bg-[#0077ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:scale-[0.98] sm:w-auto"
              >
                Try Route5
              </Link>
              <Link
                href="/product"
                className="route5-brand-lift-card inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/18 bg-white/[0.05] px-8 text-[15px] font-medium text-zinc-100 transition hover:border-sky-300/35 hover:bg-white/[0.09] active:scale-[0.99] sm:w-auto"
              >
                What we ship
              </Link>
            </div>
            <p className="mt-4 text-[12px] text-zinc-600">Trial without card · Security review on request</p>
          </div>
        </section>

        <section className="relative border-b border-white/10 bg-[#050506] py-14 sm:py-16">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
            <div className="mb-8 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Live signal</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                Execution health your board can read
              </h2>
            </div>
            <HomeDashboardShowcase />
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Why teams adopt</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                Built for operators, not slide decks
              </h2>
            </div>
            <ul className="grid flex-1 gap-4 sm:grid-cols-3 lg:max-w-[720px] lg:gap-6">
              {PILLARS.map((p) => (
                <li
                  key={p.title}
                  className="route5-brand-lift-card rounded-2xl border border-sky-400/10 bg-white/[0.03] p-5"
                >
                  <p className="text-[13px] font-semibold text-white">{p.title}</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/25 px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8 max-w-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                Proof points
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                Same product, different lens
              </h2>
              <p className="mt-2 text-[14px] text-zinc-500">
                Leadership, operations, or teams—one graph of commitments.
              </p>
            </div>
            <HomeExecutiveInteractive />
          </div>
        </section>

        <section className="border-t border-white/10 bg-gradient-to-b from-[#08080a] to-black">
          <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
            <div className="route5-brand-lift-card rounded-[22px] border border-sky-400/12 bg-[#0d0d10] p-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10">
              <div className="max-w-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                  Next step
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  Talk to us or start in minutes
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
                  Enterprise rollout, security, and procurement—we’ll match how you buy.
                </p>
              </div>
              <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:mt-0 sm:w-auto sm:max-w-none sm:flex-row sm:shrink-0">
                <a
                  href="mailto:neville@rayze.xyz?subject=Route5%20Briefing"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0071e3] px-7 text-[14px] font-semibold text-white shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] sm:w-auto"
                >
                  Book a briefing
                </a>
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 px-7 text-[14px] font-medium text-zinc-200 hover:border-white/35 sm:w-auto"
                >
                  Try Route5
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div id="contact" className="scroll-mt-24" aria-hidden />
        <Footer tone="command" />
      </div>
    </main>
  );
}

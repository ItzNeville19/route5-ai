import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import Footer from "@/components/Footer";
import HomeSessionBar from "@/components/marketing/HomeSessionBar";
import { barlowCondensedLanding, outfitLanding } from "@/lib/fonts-landing";
import { TRIAL_BODY, TRIAL_SUBLINE } from "@/lib/marketing-copy";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Route5 | Execution accountability for enterprise teams",
  description:
    "System of record for decisions and commitments—owners, deadlines, execution health. 14-day free trial, no card; contact us to continue.",
};

export const dynamic = "force-dynamic";

const CAPABILITY_TILES = [
  {
    title: "Capture",
    body: "Turn meetings, threads, and documents into structured commitments—owned, dated, and traceable.",
    accent: "from-emerald-400/18 to-transparent",
  },
  {
    title: "Desk",
    body: "Operators run one queue: assignments, deadlines, and completion without chasing status decks.",
    accent: "from-violet-500/18 to-transparent",
  },
  {
    title: "Signal",
    body: "Leadership sees load and risk from the record—not reconstructed narratives after the quarter closes.",
    accent: "from-emerald-500/14 to-transparent",
  },
  {
    title: "Integrations",
    body: "Connect Slack, Google, Linear, GitHub, and more—your tools feed the same execution spine.",
    accent: "from-violet-400/16 to-transparent",
  },
  {
    title: "Identity & rollout",
    body: "Clerk-backed auth with an enterprise SSO path—pilot-friendly rollout when legal and IT are ready.",
    accent: "from-emerald-500/12 to-transparent",
  },
  {
    title: "Evidence-first",
    body: "Exports and trails suitable for operating reviews, diligence, and procurement—not vanity charts.",
    accent: "from-violet-500/12 to-transparent",
  },
] as const;

const MARQUEE_ITEMS = [
  "Procurement-ready diligence",
  "Clerk-backed authentication",
  "Exportable commitments",
  "No vanity dashboards",
  "Built for regulated environments",
  "Pilot without IT theater",
] as const;

const AUDIENCE_ROWS = [
  {
    title: "Leadership",
    body: "Board-ready clarity on commitments, owners, and dates—without rebuilding narrative from slides.",
  },
  {
    title: "Operators",
    body: "A desk your teams can run daily: routing, deadlines, and escalations grounded in one record.",
  },
  {
    title: "Procurement & IT",
    body: "Questionnaires, phased onboarding, and controls that respect how your organization actually buys.",
  },
] as const;

export default async function Home() {
  const userId = await getAuthUserIdSafe();

  return (
    <main
      className={`theme-route5-command theme-agent-shell landing-premium landing-fortune relative min-h-dvh text-[var(--workspace-fg)] ${outfitLanding.className} ${barlowCondensedLanding.variable}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="agent-canvas min-h-dvh">
        <Navbar />
        {userId ? <HomeSessionBar /> : null}

        {/* Hero — enterprise restraint, emerald + violet Route5 identity (no faux product UI) */}
        <section
          id="hero"
          className="relative overflow-hidden border-b border-white/[0.07] pb-16 pt-[calc(5rem+env(safe-area-inset-top,0px))] sm:pb-24 sm:pt-[5.75rem]"
        >
          <div
            className="pointer-events-none absolute -left-[10%] top-[-18%] h-[min(70vh,560px)] w-[min(85vw,640px)] rounded-[40%] bg-[radial-gradient(circle_at_28%_32%,rgba(16,185,129,0.34),transparent_54%),radial-gradient(circle_at_72%_48%,rgba(139,92,246,0.26),transparent_52%),radial-gradient(circle_at_50%_70%,rgba(236,72,153,0.06),transparent_58%)] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-[8%] bottom-[-25%] h-[min(50vh,420px)] w-[min(70vw,520px)] rounded-[45%] bg-[radial-gradient(circle_at_40%_40%,rgba(52,211,153,0.22),transparent_56%),radial-gradient(circle_at_90%_20%,rgba(124,58,237,0.12),transparent_52%)] blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto grid max-w-[1240px] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-10">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="route5-landing-section-label inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/95">
                  Route5
                </span>
                <span className="route5-landing-section-label text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-300/90">
                  Execution intelligence
                </span>
              </div>
              <h1 className="font-landing-display mt-6 max-w-[18ch] text-balance text-[clamp(2.45rem,6.2vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white lg:max-w-none">
                Commitments that outlast
                <span className="mt-[0.08em] block bg-gradient-to-r from-emerald-200 via-white to-violet-200 bg-clip-text text-transparent">
                  the meeting.
                </span>
              </h1>
              <p className="mt-7 max-w-[38rem] text-pretty text-[clamp(1.05rem,1.85vw,1.2rem)] leading-[1.65] text-slate-400">
                Route5 is the operating layer for decisions—clear owners, dates, and leadership signal when slide decks
                are not evidence and chat logs are not admissible.
              </p>
              <p className="mt-5 max-w-[38rem] text-[14px] leading-relaxed text-slate-500">{TRIAL_BODY}</p>
              <div className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-md bg-emerald-400 px-9 text-[15px] font-semibold text-slate-950 shadow-[0_22px_55px_-18px_rgba(16,185,129,0.48)] ring-1 ring-white/10 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 active:scale-[0.99] sm:w-auto"
                >
                  Start a workspace
                </Link>
                <a
                  href="mailto:neville@rayze.xyz?subject=Route5%20—%20Enterprise%20briefing"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white/15 bg-white/[0.03] px-9 text-[15px] font-semibold text-zinc-100 backdrop-blur-sm transition hover:border-violet-400/35 hover:bg-white/[0.06] active:scale-[0.99] sm:w-auto"
                >
                  Talk to sales
                </a>
                <Link
                  href="/product"
                  className="inline-flex min-h-12 w-full items-center justify-center text-[14px] font-medium text-slate-500 underline-offset-4 transition hover:text-slate-300 hover:underline sm:w-auto sm:px-2"
                >
                  Product scope →
                </Link>
              </div>
              <p className="mt-6 text-[12px] tracking-wide text-slate-600">{TRIAL_SUBLINE}</p>
            </div>

            <div className="relative flex flex-col justify-center lg:col-span-5">
              <div
                className="pointer-events-none absolute inset-2 -z-10 rounded-[28px] bg-gradient-to-br from-emerald-500/12 via-transparent to-violet-500/14 blur-2xl"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-[26px] border border-white/[0.1] bg-[#070b14]/85 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_28px_80px_-40px_rgba(16,185,129,0.35)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/12 blur-3xl"
                />
                <p className="route5-landing-section-label text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/85">
                  Brand spine
                </p>
                <p className="font-landing-display mt-5 text-[clamp(1.65rem,3.5vw,2.25rem)] font-semibold tracking-[-0.03em] text-white">
                  Route<span className="text-emerald-400">5</span>
                </p>
                <p className="mt-4 text-[14px] leading-relaxed text-slate-400">
                  Named routes for decisions—owners, deadlines, and history your org can defend. Emerald marks forward
                  motion; violet marks depth and integration. Same system from capture to executive readout.
                </p>
                <div className="mt-8 flex gap-3">
                  <span className="h-14 w-1.5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_24px_rgba(16,185,129,0.35)]" />
                  <span className="h-14 w-1.5 rounded-full bg-gradient-to-b from-violet-400 to-violet-700 shadow-[0_0_24px_rgba(139,92,246,0.28)]" />
                  <span className="h-14 w-1.5 rounded-full bg-gradient-to-b from-slate-600 to-slate-800 opacity-70" />
                </div>
                <p className="mt-6 text-[11px] leading-relaxed text-slate-600">
                  No sample charts, heatmaps, or fabricated metrics—your workspace reflects real commitments after sign-in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust marquee */}
        <div className="border-y border-white/[0.06] bg-black/35">
          <div className="relative overflow-hidden py-4">
            <div className="landing-fortune-marquee-track flex w-max gap-16 px-6">
              {[0, 1].map((dup) => (
                <div
                  key={dup}
                  className="flex shrink-0 items-center gap-16"
                  aria-hidden={dup === 1 ? true : undefined}
                >
                  {MARQUEE_ITEMS.map((t) => (
                    <span
                      key={`${dup}-${t}`}
                      className="route5-landing-section-label whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform */}
        <section id="platform" className="relative border-b border-white/[0.07] bg-[#020617] py-16 sm:py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="route5-landing-section-label text-[11px] font-semibold uppercase text-emerald-400/85">
                Platform
              </p>
              <h2 className="font-landing-display mt-4 text-[clamp(1.55rem,3.2vw,2.35rem)] font-semibold tracking-[-0.025em] text-white">
                One spine from capture to executive readout
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
                Traceability and ownership without bolting a generic task tracker onto how you already operate.
              </p>
            </div>
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITY_TILES.map((tile) => (
                <li
                  key={tile.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0b1224] to-[#030712] p-6 transition hover:border-emerald-500/25"
                >
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-gradient-to-br ${tile.accent} opacity-90 blur-2xl transition group-hover:opacity-100`}
                    aria-hidden
                  />
                  <p className="font-landing-display relative text-[15px] font-semibold tracking-wide text-white">
                    {tile.title}
                  </p>
                  <p className="relative mt-3 text-[13px] leading-relaxed text-slate-500">{tile.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Why Route5 */}
        <section id="story" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="route5-landing-section-label text-[11px] font-semibold uppercase text-violet-400/85">
                Why Route5
              </p>
              <h2 className="font-landing-display mt-4 text-[clamp(1.45rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-white">
                Built for scrutiny—not vanity metrics
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
                Operators get a desk they can run; executives get signal without dashboard theater; procurement gets a
                vendor that understands paper and phased rollout.
              </p>
            </div>
            <ul className="grid flex-1 gap-4 sm:grid-cols-3 lg:max-w-[780px] lg:gap-5">
              <li className="rounded-xl border border-white/[0.08] bg-[#070b14]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="font-landing-display text-[13px] font-semibold uppercase tracking-wide text-white">
                  Clear ownership
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
                  Every commitment has an owner and a deadline—nothing floats unnamed.
                </p>
              </li>
              <li className="rounded-xl border border-white/[0.08] bg-[#070b14]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="font-landing-display text-[13px] font-semibold uppercase tracking-wide text-white">
                  Executive signal
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
                  Health and load surface for boards and operating reviews—grounded in records.
                </p>
              </li>
              <li className="rounded-xl border border-white/[0.08] bg-[#070b14]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="font-landing-display text-[13px] font-semibold uppercase tracking-wide text-white">
                  One layer
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
                  Projects, org roles, and messaging tied to the same commitments your teams execute.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* Audiences — static copy only */}
        <section id="audiences" className="border-t border-white/[0.07] bg-[#020617] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto max-w-[1240px]">
            <div className="mb-12 max-w-xl">
              <p className="route5-landing-section-label text-[11px] font-semibold uppercase text-emerald-400/85">
                Who it&apos;s for
              </p>
              <h2 className="font-landing-display mt-4 text-[clamp(1.45rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-white">
                Same commitments. Different altitude.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
                Leadership, operations, and delivery each work from one system of record—no duplicate spreadsheets.
              </p>
            </div>
            <ul className="grid gap-5 md:grid-cols-3">
              {AUDIENCE_ROWS.map((row) => (
                <li
                  key={row.title}
                  className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0a101f] to-[#050916] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <p className="font-landing-display text-[15px] font-semibold text-white">{row.title}</p>
                  <p className="mt-4 text-[14px] leading-relaxed text-slate-500">{row.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/[0.07] bg-gradient-to-b from-[#020617] to-black">
          <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
            <div className="flex flex-col gap-10 rounded-2xl border border-emerald-500/15 bg-[#071021]/90 p-8 shadow-[0_32px_90px_-48px_rgba(16,185,129,0.28)] sm:flex-row sm:items-center sm:justify-between sm:p-11">
              <div className="max-w-xl">
                <p className="route5-landing-section-label text-[11px] font-semibold uppercase text-emerald-400/85">
                  Next step
                </p>
                <h2 className="font-landing-display mt-4 text-[clamp(1.35rem,2.6vw,1.85rem)] font-semibold tracking-[-0.02em] text-white">
                  Align security, rollout, and the right plan
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
                  Tell us how your organization buys software—we support questionnaires, phased onboarding, and the
                  cadence legal and IT need.
                </p>
              </div>
              <div className="flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:shrink-0">
                <a
                  href="mailto:neville@rayze.xyz?subject=Route5%20—%20Enterprise"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-400 px-8 text-[14px] font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 sm:w-auto"
                >
                  Contact us
                </a>
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white/20 px-8 text-[14px] font-semibold text-zinc-100 transition hover:border-violet-400/40 sm:w-auto"
                >
                  Open workspace
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

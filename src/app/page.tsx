import Navbar from "@/components/Navbar";
import Link from "next/link";
import Footer from "@/components/Footer";
import { outfitLanding } from "@/lib/fonts-landing";
import HomeExecutiveInteractive from "@/components/marketing/HomeExecutiveInteractive";
import HomeDashboardShowcase from "@/components/marketing/HomeDashboardShowcase";

export default function Home() {
  return (
    <main
      className={`theme-route5-command theme-agent-shell landing-premium relative min-h-dvh text-[var(--workspace-fg)] ${outfitLanding.className}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="agent-canvas min-h-dvh">
        <Navbar />

        {/* Hero — readable in seconds */}
        <section className="relative overflow-hidden border-b border-white/10 pt-28 pb-16 sm:pt-32 sm:pb-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(6,182,212,0.12),transparent_50%)]" />
          <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
            <div className="max-w-[820px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Execution infrastructure
              </p>
              <h1 className="mt-4 text-[clamp(2.15rem,6.2vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-white">
                Decisions become commitments. Commitments get owners, dates, and follow-through.
              </h1>
              <p className="mt-5 max-w-[680px] text-[clamp(1rem,1.9vw,1.15rem)] leading-relaxed text-zinc-400">
                Route5 is the operating layer between conversation and delivery: capture what was decided,
                assign ownership automatically, and keep leadership aligned until the work ships—without
                chasing status in chat.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-11 items-center rounded-full bg-white px-7 py-3 text-[14px] font-semibold text-black transition hover:bg-zinc-100"
                >
                  Request access
                </Link>
                <a
                  href="mailto:neville@rayze.xyz?subject=Route5%20Sales"
                  className="inline-flex min-h-11 items-center rounded-full border border-white/18 bg-white/[0.04] px-7 py-3 text-[14px] font-medium text-zinc-100 transition hover:border-white/30 hover:bg-white/[0.08]"
                >
                  Contact sales
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 border-t border-white/[0.07] pt-8 text-[12px] text-zinc-500">
                <span className="font-medium tracking-wide text-zinc-400">Capture</span>
                <span className="text-zinc-700">·</span>
                <span className="font-medium tracking-wide text-zinc-400">Assign</span>
                <span className="text-zinc-700">·</span>
                <span className="font-medium tracking-wide text-zinc-400">Close the loop</span>
              </div>
            </div>
          </div>
        </section>

        {/* Product surface — dashboard parity */}
        <section className="relative border-b border-white/10 bg-[#050506] py-16 sm:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
            <div className="mb-10 max-w-[720px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Workspace
              </p>
              <h2 className="mt-3 text-[clamp(1.35rem,3vw,1.85rem)] font-semibold tracking-[-0.03em] text-white">
                The same clarity as your live dashboard—before you log in.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
                Metrics, commitment health, and owner load are visible in one surface. Below is a
                representative layout: your data, your thresholds, your teams.
              </p>
            </div>
            <HomeDashboardShowcase />
          </div>
        </section>

        {/* What it is — dense, direct */}
        <section className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                What Route5 does
              </p>
              <h2 className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-white">
                Operational memory for decisions—not another generic AI wrapper.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-400">
                <p>
                  Most teams already agree in the room. The gap is continuity: who owns the outcome,
                  when it is due, and what happens when the date moves.
                </p>
                <p>
                  Route5 holds that state over time. It connects capture, ownership, escalation, and
                  team messaging so execution does not depend on memory or manual task entry.
                </p>
                <p className="text-zinc-300">
                  If your organization runs on commitments—not bullet summaries—you get a system that
                  matches how you operate.
                </p>
              </div>
            </div>
            <div className="space-y-4 rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                In one line
              </p>
              <p className="text-[16px] font-medium leading-snug text-zinc-100">
                Route5 turns messy inputs into structured commitments with enforceable ownership—then
                tracks them until completion.
              </p>
              <ul className="space-y-3 border-t border-white/[0.06] pt-5 text-[13px] leading-relaxed text-zinc-400">
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/80" />
                  <span>Summaries describe the past. Route5 manages the future work.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/80" />
                  <span>Chat is fast. Route5 adds accountability and dates that stick.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/80" />
                  <span>Built for teams that review execution in real cadences—not slide decks alone.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Capabilities — bento */}
        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20 lg:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Platform
            </p>
            <h2 className="mt-3 max-w-[640px] text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-white">
              Everything tied to the same execution graph.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Capture",
                  body: "Meetings, threads, and mail land in one stream. Less copy-paste, fewer lost decisions.",
                },
                {
                  title: "Ownership",
                  body: "Every commitment routes to a person and a date. No orphan bullets.",
                },
                {
                  title: "Follow-through",
                  body: "Reminders and escalations fire on drift—before work becomes an incident.",
                },
                {
                  title: "Collaboration",
                  body: "Org roles, project membership, and channels aligned to real work—not generic chat.",
                },
                {
                  title: "Visibility",
                  body: "Leadership sees risk and load without pulling status from individuals.",
                },
                {
                  title: "Continuity",
                  body: "Cloud-backed workspace state across devices. Same commitments, same channels.",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e]/80 p-5 transition hover:border-white/[0.12]"
                >
                  <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Audience + FAQ */}
        <section className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-24 lg:px-12">
          <div className="mb-10 max-w-[720px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Who it is for
            </p>
            <h2 className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-white">
              Built for operators who own outcomes—not slide output.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
              Pick the lens. Same product underneath: commitments, roles, and real-time workspace
              state.
            </p>
          </div>
          <HomeExecutiveInteractive />
        </section>

        {/* Workflow — long scan */}
        <section className="border-t border-white/10 bg-black/30">
          <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20 lg:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              End-to-end
            </p>
            <h2 className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-white">
              From intake to proof of delivery.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                ["Intake", "Decisions enter from the channels you already use."],
                ["Normalization", "Owners, deadlines, and priority signals attach automatically."],
                ["Execution", "Active, at-risk, and overdue states stay visible without manual updates."],
                ["Escalation", "Managers get signal before customer impact."],
                ["Collaboration", "Chat and projects mirror membership—no shadow IT threads."],
                ["Governance", "Invites, roles, and audit-friendly structure at org scope."],
              ].map(([title, body]) => (
                <article key={String(title)} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <h3 className="text-[14px] font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/10 bg-gradient-to-b from-[#0a0a0c] to-black">
          <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20 lg:px-12">
            <div className="rounded-[24px] border border-white/[0.1] bg-[#101012] p-8 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-[560px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Commercial
                </p>
                <h2 className="mt-3 text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.03em] text-white">
                  Pricing and rollout match how your team works.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
                  We scope seats, security review, and success milestones directly—no self-serve
                  checkout that fights enterprise procurement.
                </p>
              </div>
              <div className="mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
                <a
                  href="mailto:neville@rayze.xyz?subject=Route5%20Pricing"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-8 py-3 text-[14px] font-semibold text-black transition hover:bg-zinc-100"
                >
                  Talk to us
                </a>
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-8 py-3 text-[14px] font-medium text-zinc-100 transition hover:border-white/35"
                >
                  Request access
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

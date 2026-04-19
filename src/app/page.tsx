import Navbar from "@/components/Navbar";
import Link from "next/link";
import Footer from "@/components/Footer";
import { outfitLanding } from "@/lib/fonts-landing";

export default function Home() {
  return (
    <main
      className={`theme-route5-command theme-agent-shell landing-premium relative min-h-dvh text-[var(--workspace-fg)] ${outfitLanding.className}`}
      style={{ fontFeatureSettings: '"ss01" 1, "cv11" 1' }}
    >
      <div className="agent-canvas min-h-dvh">
        <Navbar />
        <section className="relative overflow-hidden border-b border-white/10 pt-28 pb-20 sm:pt-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(139,92,246,0.22),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(6,182,212,0.18),transparent_45%)]" />
          <div className="relative mx-auto max-w-[1120px] px-5 sm:px-8 lg:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
              Enterprise execution platform
            </p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.2rem,7vw,4rem)] font-semibold tracking-[-0.05em] text-white">
              Decisions made. Commitments kept.
            </h1>
            <p className="mt-5 max-w-3xl text-[clamp(1rem,2.2vw,1.2rem)] leading-relaxed text-zinc-300">
              Route5 captures every decision from your meetings and conversations, assigns ownership,
              and follows up automatically until the work is done.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black transition hover:bg-zinc-100"
              >
                Request Access
              </Link>
              <a
                href="mailto:neville@rayze.xyz?subject=Route5%20Sales"
                className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/[0.05] px-6 py-3 text-[14px] font-medium text-zinc-100 transition hover:border-white/35 hover:bg-white/[0.1]"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:px-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">The problem</h2>
          <div className="mt-4 space-y-3 text-[clamp(1.05rem,2.2vw,1.25rem)] leading-relaxed text-zinc-100">
            <p>44% of meeting decisions never get executed.</p>
            <p className="text-zinc-300">
              Work gets decided in meetings. It gets forgotten in Slack. It gets lost in email.
            </p>
            <p className="text-zinc-300">
              Route5 closes the gap between what was decided and what actually gets done.
            </p>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="mx-auto grid max-w-[1120px] gap-4 px-5 py-16 sm:grid-cols-3 sm:px-8 lg:px-12">
            {[
              ["Capture", "Paste any meeting notes or conversation."],
              ["Own", "Every decision gets an owner and a deadline automatically."],
              ["Execute", "Automatic follow-up runs until every commitment is complete."],
            ].map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">How it works</p>
                <h3 className="mt-2 text-[18px] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-300">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:px-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Why Route5</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-zinc-300">
            <p>Unlike task managers that require manual updates.</p>
            <p>Unlike AI tools that summarize and forget.</p>
            <p className="text-zinc-100">
              Route5 maintains accountability state over time so nothing slips through.
            </p>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/35">
          <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:px-12">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Pricing</h2>
            <h3 className="mt-3 text-[clamp(1.5rem,3.8vw,2.1rem)] font-semibold tracking-[-0.03em] text-white">
              Pricing built for your team
            </h3>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-300">
              Route5 is designed for organizations that take execution seriously. Built for teams that
              cannot afford to miss a commitment. Talk to us about pricing.
            </p>
            <a
              href="mailto:neville@rayze.xyz?subject=Route5%20Pricing"
              className="mt-7 inline-flex min-h-11 items-center rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black transition hover:bg-zinc-100"
            >
              Talk to Us
            </a>
          </div>
        </section>

        <div id="contact" className="scroll-mt-24" aria-hidden />
        <Footer tone="command" />
      </div>
    </main>
  );
}

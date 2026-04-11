import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PRODUCT_LIVE, PRODUCT_ROADMAP } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "What we ship — Route5",
  description:
    "Full product rundown: what Route5 does today, roadmap, and how we work with enterprise teams.",
};

export default function PitchPage() {
  return (
    <main className="theme-glass-site relative min-h-screen">
      <Navbar />
      <article className="mx-auto max-w-[820px] px-5 pb-24 pt-28 md:px-8 md:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45">
          Route5 · partner briefing
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
          The 12-minute version we&apos;d give in the room
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
          Below is exactly what we ship today, what&apos;s on the roadmap, and how
          we engage — no borrowed traction metrics, no fake logos.
        </p>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            01 — The hook
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#1d1d1f]">
            Enterprise work still lives in unstructured text: Slack threads, Jira
            comments, analyst notes, incident write-ups. Leaders need{' '}
            <strong className="font-semibold">decisions and actions</strong>, not
            another PDF nobody reads.
          </p>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            02 — What we built (live)
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            Route5 is a signed-in workspace: projects, paste-in extraction, and
            structured outputs backed by your own tenant data store.
          </p>
          <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-[#1d1d1f]">
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Authentication.</span>{" "}
              {PRODUCT_LIVE.auth}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Projects.</span> {PRODUCT_LIVE.projects}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Extraction.</span> {PRODUCT_LIVE.extract}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Linear.</span> {PRODUCT_LIVE.linear}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">GitHub.</span> {PRODUCT_LIVE.github}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Actions.</span> {PRODUCT_LIVE.actions}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Limits &amp; data.</span>{" "}
              {PRODUCT_LIVE.limits} {PRODUCT_LIVE.data}
            </li>
          </ul>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            03 — Roadmap (explicitly not “vapor”)
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            These are directions we may pursue — they are{' '}
            <strong className="font-medium text-[#1d1d1f]">not</strong> sold as
            shipped product until they appear in the app and in our docs.
          </p>
          <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-[#1d1d1f]">
            {PRODUCT_ROADMAP.map((line) => (
              <li key={line} className="flex gap-3 border-l-2 border-[#0071e3]/35 pl-4">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            04 — Why teams talk to us
          </h2>
          <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-[#1d1d1f]">
            <li>· Clarity: one workspace, one extraction flow, traceable history.</li>
            <li>· Honesty: we label roadmap vs live — no ambiguity in diligence.</li>
            <li>· Governance-friendly posture: human review before operational reliance on AI outputs.</li>
          </ul>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            05 — Risks (we say them out loud)
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            Language models can hallucinate or miss context. Route5 outputs are
            starting points — your SMEs and owners remain accountable for decisions.
            We encode that in product copy and in our terms.
          </p>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            06 — The ask
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            If the fit is interesting: we&apos;ll walk your team through the
            workspace, align on security / data questions, and agree a concrete next
            step — pilot scope, technical deep-dive, or introduction to the right
            owner on your side.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="btn-primary inline-flex rounded-full px-7 py-3 text-[14px] font-semibold"
            >
              Request a briefing
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-black/[0.12] bg-white/80 px-7 py-3 text-[14px] font-medium text-[#1d1d1f] transition hover:bg-white"
            >
              Log in
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center rounded-full border border-black/[0.12] bg-white/80 px-7 py-3 text-[14px] font-medium text-[#1d1d1f] transition hover:bg-white"
            >
              Workspace
            </Link>
          </div>
        </section>
      </article>
      <Footer />
    </main>
  );
}

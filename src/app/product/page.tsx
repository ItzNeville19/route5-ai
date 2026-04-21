import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdvertisingSafeHarbor from "@/components/marketing/AdvertisingSafeHarbor";
import {
  POSITIONING_WEDGE,
  PRODUCT_LIVE,
  PRODUCT_PROBLEM,
  PRODUCT_ROADMAP,
  PRODUCT_VISION,
  PRODUCT_VS_EPHEMERAL_CHAT,
} from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "What we ship — Route5.ai",
  description:
    "Enterprise execution layer: owned commitments and accountability state—live MVP scope, roadmap, and how we compare to chat.",
};

export default function ProductPage() {
  return (
    <main className="route5-brand-marketing-page theme-glass-site relative min-h-screen">
      <Navbar />
      <article className="relative z-10 mx-auto max-w-[820px] px-5 pb-24 pt-28 md:px-8 md:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45">
          Route5 · product
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
          The short version we&apos;d give in the room
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
          What we ship today, what&apos;s on the roadmap, and how we engage — no borrowed
          traction metrics, no fake logos.
        </p>

        <section className="mt-10 rounded-2xl border border-black/[0.08] bg-black/[0.02] px-5 py-6 md:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">
            North star
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-[#1d1d1f]">{PRODUCT_VISION.category}</p>
          <p className="mt-3 text-[17px] leading-relaxed text-[#6e6e73]">{PRODUCT_VISION.problem}</p>
          <p className="mt-3 text-[16px] leading-relaxed text-[#1d1d1f]">{PRODUCT_VISION.outcome}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">{PRODUCT_VISION.not}</p>
          <p className="mt-4 text-[14px] leading-relaxed text-[#86868b]">{PRODUCT_VISION.icp}</p>
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            01 — Who we built for first
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#1d1d1f]">
            <strong className="font-semibold">{POSITIONING_WEDGE.label}.</strong> Primary
            buyers: {POSITIONING_WEDGE.buyerRoles.join("; ")}.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            {POSITIONING_WEDGE.buyerSafePromise}
          </p>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            02 — The problem Route5 targets
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#1d1d1f]">
            <strong className="font-semibold">{PRODUCT_PROBLEM.headline}.</strong>{" "}
            {PRODUCT_PROBLEM.body}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            {PRODUCT_PROBLEM.route5Does}
          </p>
        </section>

        <section
          id="chat-vs-workspace"
          className="mt-12 scroll-mt-28 border-t border-black/[0.08] pt-12"
        >
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            03 — {PRODUCT_VS_EPHEMERAL_CHAT.sectionTitle}
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            {PRODUCT_VS_EPHEMERAL_CHAT.intro}
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-black/[0.08]">
            <table className="w-full min-w-[520px] text-left text-[14px] leading-relaxed">
              <thead>
                <tr className="border-b border-black/[0.08] bg-black/[0.02] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">General chat</th>
                  <th className="px-4 py-3 font-medium">Route5</th>
                </tr>
              </thead>
              <tbody className="text-[#1d1d1f]">
                {PRODUCT_VS_EPHEMERAL_CHAT.rows.map((row) => (
                  <tr key={row.label} className="border-b border-black/[0.06] last:border-0">
                    <td className="px-4 py-4 font-semibold text-[#1d1d1f]">{row.label}</td>
                    <td className="px-4 py-4 text-[#6e6e73]">{row.chat}</td>
                    <td className="px-4 py-4 text-[#1d1d1f]">{row.route5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            04 — What we built (live)
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            Route5 is a signed-in workspace: projects, Desk processes, structured fields, and
            action checklists — backed by your tenant data store. {POSITIONING_WEDGE.qualityBar}
          </p>
          <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-[#1d1d1f]">
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Authentication.</span> {PRODUCT_LIVE.auth}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Projects.</span> {PRODUCT_LIVE.projects}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Webhook input.</span> {PRODUCT_LIVE.ingest}
            </li>
            <li className="glass-surface rounded-2xl px-5 py-4">
              <span className="font-semibold">Decision capture.</span> {PRODUCT_LIVE.extract}
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
              <span className="font-semibold">Limits &amp; data.</span> {PRODUCT_LIVE.limits}{" "}
              {PRODUCT_LIVE.data}
            </li>
          </ul>
        </section>

        <section id="roadmap" className="mt-12 scroll-mt-28 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            05 — Roadmap (explicitly not “vapor”)
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            These are directions we may pursue — they are{" "}
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
            06 — Why teams talk to us
          </h2>
          <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-[#1d1d1f]">
            <li>· Clarity: one workspace, one decision-capture flow, traceable history.</li>
            <li>· Honesty: we label roadmap vs live — no ambiguity in diligence.</li>
            <li>· Governance-friendly posture: human review before operational reliance on AI outputs.</li>
          </ul>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            07 — Risks (we say them out loud)
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
            Language models can hallucinate or miss context. Route5 outputs are
            starting points — your SMEs and owners remain accountable for decisions.
            We encode that in product copy and in our terms.
          </p>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            08 — The ask
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
              href="/overview"
              className="inline-flex items-center rounded-full border border-black/[0.12] bg-white/80 px-7 py-3 text-[14px] font-medium text-[#1d1d1f] transition hover:bg-white"
            >
              Workspace
            </Link>
          </div>
        </section>

        <section className="mt-12 border-t border-black/[0.08] pt-10">
          <AdvertisingSafeHarbor variant="product" />
        </section>
      </article>
      <Footer />
    </main>
  );
}

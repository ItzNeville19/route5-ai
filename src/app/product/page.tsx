import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketingPublicShell from "@/components/marketing/MarketingPublicShell";
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
  title: "Product — Route5",
  description:
    "Route5 product overview: current capabilities, roadmap themes, and how to engage our team for rollout and security review.",
};

export default function ProductPage() {
  return (
    <MarketingPublicShell>
      <Navbar />
      <article className="relative z-10 mx-auto max-w-[820px] px-5 pb-24 pt-28 md:px-8 md:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
          Route5 · product
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold tracking-[-0.04em] text-white">
          Product overview
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
          What is in production, what is on the roadmap, and how to work with us for pilots, security review, and rollout.
        </p>

        <section className="mt-10 rounded-2xl border border-white/12 bg-white/[0.05] px-5 py-6 md:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">
            North star
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-white">{PRODUCT_VISION.category}</p>
          <p className="mt-3 text-[17px] leading-relaxed text-zinc-200">{PRODUCT_VISION.problem}</p>
          <p className="mt-3 text-[16px] leading-relaxed text-zinc-100">{PRODUCT_VISION.outcome}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-200">{PRODUCT_VISION.focus}</p>
          <p className="mt-4 text-[14px] leading-relaxed text-zinc-300">{PRODUCT_VISION.icp}</p>
        </section>

        <section className="mt-14 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            01 — Who we built for first
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white">
            <strong className="font-semibold">{POSITIONING_WEDGE.label}.</strong> Primary
            buyers: {POSITIONING_WEDGE.buyerRoles.join("; ")}.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
            {POSITIONING_WEDGE.buyerSafePromise}
          </p>
        </section>

        <section className="mt-12 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            02 — The problem Route5 targets
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white">
            <strong className="font-semibold">{PRODUCT_PROBLEM.headline}.</strong>{" "}
            {PRODUCT_PROBLEM.body}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
            {PRODUCT_PROBLEM.route5Does}
          </p>
        </section>

        <section
          id="chat-vs-workspace"
          className="mt-12 scroll-mt-28 border-t border-white/10 pt-12"
        >
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            03 — {PRODUCT_VS_EPHEMERAL_CHAT.sectionTitle}
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
            {PRODUCT_VS_EPHEMERAL_CHAT.intro}
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[520px] text-left text-[14px] leading-relaxed">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200/75">
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">General chat</th>
                  <th className="px-4 py-3 font-medium">Route5</th>
                </tr>
              </thead>
              <tbody className="text-zinc-100">
                {PRODUCT_VS_EPHEMERAL_CHAT.rows.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-4 py-4 font-semibold text-white">{row.label}</td>
                    <td className="px-4 py-4 text-zinc-300">{row.chat}</td>
                    <td className="px-4 py-4 text-zinc-100">{row.route5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            04 — In production
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
            Route5 is a signed-in workspace: projects, Desk processes, structured fields, and
            action checklists — backed by your tenant data store. {POSITIONING_WEDGE.qualityBar}
          </p>
          <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-100">
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">Authentication.</span> {PRODUCT_LIVE.auth}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">Projects.</span> {PRODUCT_LIVE.projects}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">Webhook input.</span> {PRODUCT_LIVE.ingest}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">Decision capture.</span> {PRODUCT_LIVE.extract}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">Linear.</span> {PRODUCT_LIVE.linear}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">GitHub.</span> {PRODUCT_LIVE.github}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">Actions.</span> {PRODUCT_LIVE.actions}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
              <span className="font-semibold">Limits &amp; data.</span> {PRODUCT_LIVE.limits}{" "}
              {PRODUCT_LIVE.data}
            </li>
          </ul>
        </section>

        <section id="roadmap" className="mt-12 scroll-mt-28 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            05 — Roadmap
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
            These themes describe where we are investing. Capabilities are committed when they are available in the product and documented here—not before.
          </p>
          <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-zinc-100">
            {PRODUCT_ROADMAP.map((line) => (
              <li key={line} className="flex gap-3 border-l-2 border-sky-400/45 pl-4">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            06 — Why teams talk to us
          </h2>
          <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-zinc-100">
            <li>· Clarity: one workspace, one capture flow, traceable history.</li>
            <li>· Clear scope: in-product and documentation stay aligned on what is available today.</li>
            <li>· Governance: human review of outputs before they drive operational decisions.</li>
          </ul>
        </section>

        <section className="mt-12 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            07 — Using model-assisted capture responsibly
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
            Language models can miss context. Route5 surfaces structured drafts; your
            subject-matter experts and owners remain accountable for what ships. That
            expectation is reflected in product copy and in our terms.
          </p>
        </section>

        <section className="mt-12 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
            08 — The ask
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-200">
            If the fit is interesting: we&apos;ll walk your team through the
            workspace, align on security / data questions, and agree a concrete next
            step — pilot scope, technical deep-dive, or introduction to the right
            owner on your side.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex rounded-full bg-sky-500 px-7 py-3 text-[14px] font-semibold text-[#041210] shadow-md shadow-cyan-500/20 transition hover:bg-sky-400"
            >
              Request a briefing
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-7 py-3 text-[14px] font-medium text-white transition hover:bg-white/[0.12]"
            >
              Log in
            </Link>
            <Link
              href="/overview"
              className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-7 py-3 text-[14px] font-medium text-white transition hover:bg-white/[0.12]"
            >
              Workspace
            </Link>
          </div>
        </section>

        <section className="mt-12 border-t border-white/10 pt-10">
          <AdvertisingSafeHarbor variant="product" marketingDark />
        </section>
      </article>
      <Footer tone="command" />
    </MarketingPublicShell>
  );
}

import Link from "next/link";
import { PRODUCT_LIVE, PRODUCT_ROADMAP } from "@/lib/product-truth";

const liveEntries: { title: string; text: string }[] = [
  { title: "Authentication", text: PRODUCT_LIVE.auth },
  { title: "Projects", text: PRODUCT_LIVE.projects },
  { title: "Extraction", text: PRODUCT_LIVE.extract },
  { title: "Linear", text: PRODUCT_LIVE.linear },
  { title: "GitHub", text: PRODUCT_LIVE.github },
  { title: "Actions", text: PRODUCT_LIVE.actions },
  { title: "Limits", text: PRODUCT_LIVE.limits },
  { title: "Data", text: PRODUCT_LIVE.data },
];

export function ProductSection() {
  return (
    <section id="product" className="border-t border-white/[0.08] bg-black py-20 md:py-28">
      <div className="container-apple">
        <p className="label-text mb-3 text-white/45">Product</p>
        <h2 className="section-headline mb-4 max-w-2xl text-white">
          What ships today
        </h2>
        <p className="body-large mb-12 max-w-2xl text-white/55">
          Structured extraction and tracking in your workspace—no vaporware in this list.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liveEntries.map(({ title, text }) => (
            <li
              key={title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-5 transition hover:border-white/[0.14]"
            >
              <p className="text-[13px] font-medium uppercase tracking-wide text-white/40">
                {title}
              </p>
              <p className="mt-2 text-[15px] leading-snug text-white/85">{text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-6">
          <p className="label-text mb-3 text-white/40">Roadmap (not live)</p>
          <ul className="space-y-2 text-[14px] text-white/55">
            {PRODUCT_ROADMAP.map((item) => (
              <li key={item}>— {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section id="trust" className="border-t border-white/[0.08] bg-[#0a0a0c] py-20 md:py-24">
      <div className="container-apple">
        <p className="label-text mb-3 text-white/45">Trust</p>
        <h2 className="section-headline mb-4 max-w-2xl text-white">
          Data and access
        </h2>
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="text-[17px] font-semibold text-white">Authentication</h3>
            <p className="mt-2 body-copy text-white/55">
              {PRODUCT_LIVE.auth} SSO follows your Clerk dashboard configuration.
            </p>
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-white">Storage</h3>
            <p className="mt-2 body-copy text-white/55">{PRODUCT_LIVE.data}</p>
          </div>
        </div>
        <p className="mt-10 max-w-2xl text-[14px] leading-relaxed text-white/45">
          Ask us for subprocessors, DPA status, and deployment options under NDA—see footer for
          legal policies.
        </p>
      </div>
    </section>
  );
}

export function BusinessSection() {
  return (
    <section id="business" className="border-t border-white/[0.08] bg-black py-20 md:py-24">
      <div className="container-apple">
        <p className="label-text mb-3 text-white/45">For leaders</p>
        <h2 className="section-headline mb-6 max-w-2xl text-white">
          Clarity for decisions, not another black box
        </h2>
        <p className="body-large mb-8 max-w-2xl text-white/55">
          Route5 turns messy text into summaries, decisions, and action items your team can
          review—so executives get signal without promising autonomous legacy replacement
          overnight.
        </p>
        <Link
          href="/contact"
          className="btn-primary inline-flex text-[15px] font-semibold"
        >
          Talk with us
        </Link>
      </div>
    </section>
  );
}

export function OutcomesSection() {
  return (
    <section id="roi" className="border-t border-white/[0.08] bg-[#0a0a0c] py-16 md:py-20">
      <div className="container-apple">
        <p className="label-text mb-8 text-white/45">At a glance</p>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            { value: "3", label: "Outputs per run", hint: "Summary · decisions · actions" },
            { value: "100k", label: "Character limit", hint: "Per extraction request" },
            { value: "∞", label: "Projects", hint: "One workspace trail per initiative" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-black/50 px-6 py-8 backdrop-blur-sm md:px-8"
            >
              <div className="text-[28px] font-semibold tabular-nums tracking-[-0.03em] text-white">
                {s.value}
              </div>
              <div className="mt-1 text-[15px] font-medium text-white/90">{s.label}</div>
              <div className="mt-0.5 text-[13px] text-white/45">{s.hint}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeClosingCTA() {
  return (
    <section className="border-t border-white/[0.08] bg-black py-20 md:py-28">
      <div className="container-apple flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em] text-white">
            Ready to see the workspace?
          </h2>
          <p className="mt-2 max-w-xl text-[15px] text-white/55">
            Contact for a briefing, or sign in if your team already has access.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="btn-primary inline-flex justify-center px-8 py-3 text-[15px] font-semibold"
          >
            Contact
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-[15px] font-medium text-white/90 transition hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}

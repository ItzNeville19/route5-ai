import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Trust & compliance — Route5",
  description:
    "Security review questionnaire, DPA requests, procurement, and enterprise deployment expectations for Route5.",
};

const questionnaireSections = [
  {
    title: "Organization & scope",
    items: [
      "Legal name, HQ region, and primary industry.",
      "Approximate number of workspace users and environments (prod / staging).",
      "Data categories you plan to process through Route5 (e.g. internal docs, tickets, design links).",
    ],
  },
  {
    title: "Security & access",
    items: [
      "Identity: how your team signs in today (e.g. SSO provider) and desired session expectations.",
      "Administration: who approves integrations and decision capture usage in your org.",
      "Incident expectations: preferred notification channel for security or availability events.",
    ],
  },
  {
    title: "Infrastructure & data handling",
    items: [
      "Deployment model: cloud workspace vs future VPC / dedicated region (we align on roadmap).",
      "Retention: how long captured artifacts should remain available in-product.",
      "Export & exit: whether you need scheduled exports or API access for offboarding.",
    ],
  },
];

const linkC = "font-medium text-sky-400 hover:underline";

export default function TrustPage() {
  return (
    <main className="route5-brand-dark-marketing-shell theme-route5-command theme-agent-shell relative min-h-screen text-zinc-100">
      <Navbar />
      <div className="container-apple relative z-10 pb-24 pt-28 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
            Trust &amp; compliance
          </p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-white">
            Security, legal, and procurement
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-zinc-200">
            Route5 is built for teams that need structured intelligence from text. This page is the concrete path for
            security questionnaires, DPA requests, procurement (NET terms, invoices), and larger rollouts — including
            custom retention and VPC / bring-your-own conversations.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-[720px] space-y-10">
          <section className="rounded-3xl border border-white/12 bg-white/[0.06] p-8 text-left backdrop-blur">
            <h2 className="text-[15px] font-semibold text-white">Security questionnaire</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-200">
              Use the outline below as a starting point for your vendor review. Send the completed context (or your own
              questionnaire) to us via{" "}
              <Link href="/contact?subject=Security%20questionnaire" className={linkC}>
                the contact form
              </Link>{" "}
              <span className="text-zinc-200">(subject line is prefilled)</span>. We respond with written answers and
              point-in-time detail suitable for your InfoSec review.
            </p>
            <div className="mt-6 space-y-6">
              {questionnaireSections.map((sec) => (
                <div key={sec.title}>
                  <h3 className="text-[13px] font-semibold text-white">{sec.title}</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-zinc-200">
                    {sec.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/12 bg-white/[0.06] p-8 text-left backdrop-blur">
            <h2 className="text-[15px] font-semibold text-white">Data Processing Agreement (DPA)</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-200">
              For customers processing personal data subject to GDPR, CCPA, or similar regimes, we provide a DPA that
              references our role, subprocessors, and your instructions. Start a{" "}
              <Link href="/contact?subject=DPA%20request" className={linkC}>
                DPA request
              </Link>{" "}
              with your company legal name and jurisdiction. We will follow up with the next step for signature.
            </p>
          </section>

          <section className="rounded-3xl border border-white/12 bg-white/[0.06] p-8 text-left backdrop-blur">
            <h2 className="text-[15px] font-semibold text-white">Procurement, NET terms, and rollout</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-200">
              Enterprise and volume purchases can be invoiced with NET terms where credit is approved.{" "}
              <Link href="/contact?subject=Enterprise%20procurement" className={linkC}>
                Contact us
              </Link>{" "}
              with expected seat count, billing entity, and any vendor onboarding steps (vendor ID, W-9, or regional
              equivalents). We assign a single point of contact for rollout and success check-ins on larger
              deployments.
            </p>
          </section>

          <section className="rounded-3xl border border-white/12 bg-white/[0.06] p-8 text-left backdrop-blur">
            <h2 className="text-[15px] font-semibold text-white">Custom retention, export, and VPC / BYO</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-200">
              Default product behavior is described in our{" "}
              <Link href="/privacy" className={linkC}>
                Privacy Policy
              </Link>
              . For enterprise expectations — custom retention windows, bulk export cadence, or dedicated infrastructure —
              we scope these in writing after an intro call.{" "}
              <Link href="/contact?subject=Custom%20retention%20%2F%20VPC" className={linkC}>
                Start a conversation
              </Link>
              .
            </p>
          </section>

          <p className="text-[13px] leading-relaxed text-zinc-200">
            See also{" "}
            <Link href="/pricing" className={linkC}>
              Pricing
            </Link>{" "}
            for workspace limits and{" "}
            <Link href="/terms" className={linkC}>
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer tone="command" />
    </main>
  );
}

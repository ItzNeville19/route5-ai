import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

type Props = {
  signedIn: boolean;
};

const plans = [
  {
    id: "pilot",
    name: "Pilot",
    kicker: "Try the full workspace",
    focus: "14-day evaluation",
    description: "No card. Prove commitment tracking and agent workflows with your real operating cadence.",
    accent: false,
  },
  {
    id: "org",
    name: "Organization",
    kicker: "Most teams start here",
    focus: "Seats · integrations · governance",
    description:
      "Predictable rollout: aligned to how your org buys software, with onboarding that matches operational reality.",
    accent: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    kicker: "Global & regulated",
    focus: "Security review · SLA options",
    description:
      "Dedicated review path for procurement, data residency asks, and high-trust rollout across regions.",
    accent: false,
  },
];

export default function PublicPlansGrid({ signedIn }: Props) {
  return (
    <div className="mx-auto mt-16 max-w-[1100px]">
      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={
              plan.accent
                ? "route5-marketing-dark-card relative flex flex-col rounded-2xl border-2 border-emerald-400/55 p-6 shadow-[0_20px_60px_-28px_rgba(16,185,129,0.35)] ring-1 ring-white/10 sm:p-7"
                : "route5-marketing-dark-card flex flex-col rounded-2xl border border-white/20 p-6 ring-1 ring-black/40 sm:p-7"
            }
          >
            {plan.accent ? (
              <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black">
                Popular
              </p>
            ) : null}
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
              {plan.kicker}
            </p>
            <h3 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-white">{plan.name}</h3>
            <p className="mt-1 text-[15px] font-medium text-zinc-100">{plan.focus}</p>
            <p className="mt-4 flex-1 text-[15px] leading-relaxed text-zinc-100">{plan.description}</p>
            <p className="mt-6 border-t border-white/15 pt-4 text-[13px] leading-snug text-zinc-200">
              Investment is scoped in a single conversation — we&apos;ll align to team size, primary use case, and
              compliance needs.
            </p>
          </div>
        ))}
      </div>

      <div className="route5-marketing-dark-cta mt-12 rounded-2xl border border-white/18 p-8 text-center sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/85">Next step</p>
        <h3 className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-white">
          See a number that fits your operating model
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-200">
          Share team size and primary use case — we&apos;ll reply with options (no generic &quot;grey on grey&quot;
          PDFs).
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact?utm_source=pricing"
            className="inline-flex min-h-11 items-center rounded-full bg-white px-8 py-3 text-[14px] font-semibold text-black transition hover:bg-zinc-100"
          >
            Contact for pricing
          </Link>
          {signedIn ? (
            <Link
              href="/workspace/billing"
              className="inline-flex min-h-11 items-center rounded-full border border-emerald-400/35 bg-emerald-500/[0.12] px-6 py-3 text-[14px] font-medium text-emerald-50 transition hover:border-emerald-300/45 hover:bg-emerald-500/[0.2]"
            >
              Open billing workspace
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-6 py-3 text-[14px] font-medium text-white transition hover:border-white/35 hover:bg-white/[0.06]"
            >
              Sign in first
            </Link>
          )}
        </div>
        <p className="mt-6 text-[13px] text-zinc-200">
          Direct:{" "}
          <a
            className="font-medium text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Route5 — pricing")}`}
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}

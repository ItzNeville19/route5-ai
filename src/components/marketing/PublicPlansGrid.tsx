import Link from "next/link";
import { BILLING_LIVE, PLAN_TIERS, type PlanTierId } from "@/lib/plans-catalog";

function TierCta({
  tierId,
  cta,
  signedIn,
}: {
  tierId: PlanTierId;
  cta: string;
  signedIn: boolean;
}) {
  if (tierId === "free") {
    return signedIn ? (
      <Link
        href="/projects"
        className="btn-primary inline-flex w-full justify-center rounded-xl py-2.5 text-[13px] font-semibold"
      >
        Open workspace
      </Link>
    ) : (
      <Link
        href="/sign-up"
        className="btn-primary inline-flex w-full justify-center rounded-xl py-2.5 text-[13px] font-semibold"
      >
        Create account
      </Link>
    );
  }
  if (tierId === "enterprise" || tierId === "ultra") {
    return (
      <Link
        href={`/contact?subject=${encodeURIComponent(`Route5 ${tierId} plan`)}`}
        className="inline-flex w-full justify-center rounded-xl border border-black/[0.12] bg-white/80 py-2.5 text-[13px] font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-white"
      >
        {cta}
      </Link>
    );
  }
  if (BILLING_LIVE) {
    return (
      <Link
        href="/contact"
        className="inline-flex w-full justify-center rounded-xl bg-[#0071e3] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
      >
        {cta}
      </Link>
    );
  }
  return (
    <Link
      href={`/contact?subject=${encodeURIComponent("Route5 Pro")}`}
      className="inline-flex w-full justify-center rounded-xl bg-[#0071e3] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
    >
      {cta}
    </Link>
  );
}

type Props = {
  /** From `auth()` on the pricing page — drives Free tier CTA. */
  signedIn: boolean;
};

/** Public marketing pricing — same tiers and copy as in-app account plans (`PLAN_TIERS`). */
export default function PublicPlansGrid({ signedIn }: Props) {
  return (
    <div className="mx-auto mt-12 grid max-w-[1100px] gap-5 sm:grid-cols-2 lg:grid-cols-2">
      {PLAN_TIERS.map((tier) => (
        <div
          key={tier.id}
          className={`flex flex-col rounded-3xl border p-7 text-left ${
            tier.highlighted
              ? "border-[#a78bfa]/45 bg-gradient-to-b from-white/90 to-[#faf5ff]/95 shadow-[0_24px_60px_-28px_rgba(91,33,182,0.25)]"
              : "glass-liquid liquid-glass-shimmer"
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
              {tier.name}
            </p>
            <p className="text-[22px] font-semibold tabular-nums text-[#1d1d1f]">
              {tier.price}
              {tier.price !== "Custom" ? (
                <span className="text-[13px] font-medium text-[#6e6e73]"> / mo</span>
              ) : null}
            </p>
          </div>
          <p className="mt-2 text-[15px] font-medium text-[#1d1d1f]">{tier.tagline}</p>
          <p className="mt-2 rounded-xl border border-black/[0.06] bg-black/[0.03] px-3 py-2 text-[12px] leading-relaxed text-[#6e6e73]">
            {tier.valueNote}
          </p>
          <ul className="mt-4 flex-1 space-y-2.5 text-[13px] leading-relaxed text-[#424245]">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[#5b21b6]" aria-hidden>
                  ✓
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {tier.id === "enterprise" ? (
            <p className="mt-3 text-[12px] leading-relaxed text-[#6e6e73]">
              Security and procurement:{" "}
              <Link href="/trust" className="font-medium text-[#0071e3] hover:underline">
                Trust &amp; compliance
              </Link>
              .
            </p>
          ) : null}
          <div className="mt-6">
            <TierCta tierId={tier.id} cta={tier.cta} signedIn={signedIn} />
          </div>
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";

type Props = {
  signedIn: boolean;
};

export default function PublicPlansGrid({ signedIn }: Props) {
  return (
    <div className="mx-auto mt-12 max-w-[960px]">
      <div className="rounded-3xl border border-white/15 bg-black/35 p-8 text-center backdrop-blur-md sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Enterprise pricing
        </p>
        <h3 className="mt-3 text-[clamp(1.5rem,3.5vw,2.1rem)] font-semibold tracking-[-0.03em] text-white">
          Pricing that scales with your team
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-300">
          Route5 is built for teams that cannot afford to miss a commitment. We tailor pricing and
          rollout support to your operating model.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="mailto:neville@rayze.xyz?subject=Route5%20Pricing"
            className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black transition hover:bg-zinc-100"
          >
            Contact for Pricing
          </a>
          {signedIn ? (
            <Link
              href="/workspace/billing"
              className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-6 py-3 text-[14px] font-medium text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.06]"
            >
              Open billing workspace
            </Link>
          ) : null}
        </div>
        <p className="mt-4 text-[12px] text-zinc-500">
          Contact: <a className="hover:text-zinc-300" href="mailto:neville@rayze.xyz">neville@rayze.xyz</a>
        </p>
      </div>
    </div>
  );
}

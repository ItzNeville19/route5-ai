import Link from "next/link";

/** Shown on the public home when the visitor already has a session — fast path back to work. */
export default function HomeSessionBar() {
  return (
    <div className="relative z-[5] border-b border-emerald-500/25 bg-gradient-to-r from-emerald-950/90 via-[#071018] to-violet-950/85">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
        <p className="text-[13px] leading-snug text-slate-200">
          <span className="font-semibold text-white">You&apos;re signed in.</span>{" "}
          <span className="text-slate-400">Pick up where you left off — Desk and Overview stay in sync.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/desk"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-400 px-5 text-[13px] font-semibold text-slate-950 shadow-[0_12px_36px_-14px_rgba(16,185,129,0.55)] transition hover:bg-emerald-300"
          >
            Open Desk
          </Link>
          <Link
            href="/overview"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 text-[13px] font-semibold text-white transition hover:border-violet-400/35 hover:bg-white/[0.07]"
          >
            Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

/**
 * OpenAI-style featured story row: one primary surface, deep link into the page.
 */
export default function HomeFeatured() {
  return (
    <section className="border-t border-white/10 bg-black px-5 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1280px] py-10 md:py-14">
        <Link
          href="#solution"
          className="group block overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] via-transparent to-[#0071e3]/[0.08] transition-colors hover:border-white/20"
        >
          <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12 lg:p-14">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Platform · Shipping now
              </p>
              <h2 className="mt-3 text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-white">
                From paste to project intelligence
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/55">
                Projects, extraction, and action tracking — Clerk, Supabase, structured
                outputs. No connector required for v1.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[15px] font-medium text-[#0071e3] md:flex-col md:items-end">
              <span className="transition group-hover:translate-x-0.5">See how it works</span>
              <span aria-hidden className="text-xl md:rotate-[-90deg] md:text-2xl">
                →
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

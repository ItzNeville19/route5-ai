import Link from "next/link";

/** Shown on the public home when the visitor already has a session — fast path back to work. */
export default function HomeSessionBar() {
  return (
    <div className="fixed left-0 right-0 top-14 z-[995] border-b border-blue-200/80 bg-gradient-to-r from-sky-50 via-white to-blue-50 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
        <p className="text-[13px] leading-snug text-slate-700">
          <span className="font-semibold text-slate-900">You&apos;re signed in.</span>{" "}
          <span className="text-slate-600">Continue on Desk or your overview—same tasks, same companies.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/desk"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Open Desk
          </Link>
          <Link
            href="/overview"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-800 transition hover:border-blue-300"
          >
            Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

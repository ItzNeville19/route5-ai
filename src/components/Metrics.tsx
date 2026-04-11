"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { defaultTransition, easeApple, inViewOpts } from "@/lib/motion";

const metrics = [
  { value: "3", label: "Structured fields", sub: "Summary, decisions, and actions every run" },
  { value: "100k", label: "Characters per request", sub: "Enough for long threads in one paste" },
  { value: "0", label: "Production touchpoints", sub: "This baseline is text-in, structured data out" },
];

const comparison = [
  { category: "Input", adhoc: "Copy-paste between docs and chat", route5: "Paste once; persist to a project" },
  { category: "Alignment", adhoc: "Everyone has a different story", route5: "Shared summary + decision list" },
  { category: "Follow-through", adhoc: "Action items live in side channels", route5: "Check items off in one place" },
  { category: "Audit", adhoc: "Hard to reconstruct who agreed to what", route5: "Timestamped extractions per project" },
];

export default function Metrics() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section
      id="roi"
      ref={ref}
      className="border-t border-white/10 bg-black py-28 text-white lg:py-36"
    >
      <div className="container-apple">

        <motion.div
          initial={{ opacity: 1, y: 22 }}
          animate={{ opacity: 1, y: inView ? 0 : 22 }}
          transition={defaultTransition}
          className="mb-16 max-w-[700px]"
        >
          <p className="label-text mb-5 text-white/45">Proof</p>
          <h2 className="section-headline text-white">
            What the product does.
          </h2>
          <p className="mt-4 max-w-[480px] text-[16px] text-white/55">
            No fake ROI. These are mechanics.
          </p>
        </motion.div>

        <div className="mb-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-3">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 1, y: 16 }}
              animate={{ opacity: 1, y: inView ? 0 : 16 }}
              transition={{ duration: 0.45, delay: 0.07 * i, ease: easeApple }}
              className="bg-black/50 px-6 py-8 backdrop-blur-sm sm:px-8"
            >
              <div className="mb-3 text-[40px] font-bold leading-none tracking-[-0.03em] text-[#0071e3] lg:text-[48px]">
                {m.value}
              </div>
              <div className="mb-1.5 text-[14px] font-semibold leading-snug tracking-[-0.018em] text-white">
                {m.label}
              </div>
              <div className="text-[13px] leading-snug text-white/50">
                {m.sub}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 1, y: 24 }}
          animate={{ opacity: 1, y: inView ? 0 : 24 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeApple }}
        >
          <h3 className="mb-8 text-[22px] font-semibold tracking-[-0.022em] text-white">
            Ad-hoc triage vs. Route5 workspace
          </h3>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="w-1/4 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-white/45 sm:px-6" />
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-white/45 sm:px-6">
                    Ad-hoc
                  </th>
                  <th className="bg-[#0071e3]/15 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#5ac8fa] sm:px-6">
                    Route5 (today)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {comparison.map((row) => (
                  <tr
                    key={row.category}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-4 text-[13px] font-semibold tracking-[-0.01em] text-white sm:px-6">
                      {row.category}
                    </td>
                    <td className="px-4 py-4 text-[13px] tracking-[-0.01em] text-white/55 sm:px-6">
                      {row.adhoc}
                    </td>
                    <td className="bg-[#0071e3]/10 px-4 py-4 text-[13px] font-medium tracking-[-0.01em] text-white/90 sm:px-6">
                      {row.route5}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

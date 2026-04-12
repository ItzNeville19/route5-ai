"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { defaultTransition, easeApple, inViewOpts, springLiquid } from "@/lib/motion";
import { PRODUCT_ROADMAP } from "@/lib/product-truth";

const liveFeatures = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Structured extraction",
    description: "Summary, decisions, and actions from every run — stored per project.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Action tracking",
    description: "Check off work item by item; completion feeds workspace analytics.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3v18h18M7 16l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Execution metrics",
    description: "Completion rate, stale open actions, and activity trends from your data.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Projects & history",
    description: "Per initiative. Timestamped runs you can duplicate and revisit.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Linear & GitHub",
    description: "Import issue context into projects — walkthroughs in-app when configured.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Durable storage",
    description: "Supabase or local SQLite — your data, your scope.",
  },
];

export default function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="capabilities"
      ref={ref}
      className="border-t border-[rgba(167,139,250,0.12)] bg-gradient-to-b from-black via-[#07070c] to-black py-28 lg:py-36"
    >
      <div className="container-apple">

        <motion.div
          initial={{ opacity: 1, y: 22 }}
          animate={{ opacity: 1, y: inView ? 0 : 22 }}
          transition={defaultTransition}
          className="mb-12 max-w-[720px]"
        >
          <p className="label-text mb-5 text-[rgba(167,139,250,0.55)]">Product</p>
          <h2 className="section-headline text-white">
            Execution intelligence — shipped vs next.
          </h2>
        </motion.div>

        <p className="mb-5 text-[12px] font-semibold uppercase tracking-widest text-[#a78bfa]">
          Live
        </p>
        <div
          className="mb-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          style={{ perspective: 1400 }}
        >
          {liveFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 1, y: 16 }}
              animate={{ opacity: 1, y: inView ? 0 : 16 }}
              transition={{ duration: 0.45, delay: 0.04 * i, ease: easeApple }}
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      y: -8,
                      rotateX: 4,
                      rotateY: -3,
                      transition: springLiquid,
                    }
              }
              style={{ transformStyle: "preserve-3d" }}
              className="liquid-glass-dark liquid-glass-dark-interactive liquid-glass-shimmer group relative overflow-hidden rounded-[20px] p-8"
            >
              <div className="absolute right-4 top-4 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Shipped
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(167,139,250,0.18)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative mb-5 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors group-hover:bg-[#7c3aed]">
                {f.icon}
              </div>
              <div className="relative">
                <h3 className="mb-3 text-[17px] font-semibold leading-snug tracking-[-0.022em] text-white">
                  {f.title}
                </h3>
                <p className="text-[14px] leading-relaxed tracking-[-0.01em] text-white/55">
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mb-5 text-[12px] font-semibold uppercase tracking-widest text-white/45">
          Roadmap
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {PRODUCT_ROADMAP.map((line, i) => (
            <motion.div
              key={line}
              initial={{ opacity: 1, y: 14 }}
              animate={{ opacity: 1, y: inView ? 0 : 14 }}
              transition={{ duration: 0.4, delay: 0.05 * i, ease: easeApple }}
              whileHover={reduceMotion ? undefined : { y: -3, transition: springLiquid }}
              className="liquid-glass-dark flex items-start gap-4 rounded-[20px] border-dashed border-white/30 px-6 py-5"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Planned
              </span>
              <p className="text-[15px] leading-snug tracking-[-0.015em] text-white/80">
                {line}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

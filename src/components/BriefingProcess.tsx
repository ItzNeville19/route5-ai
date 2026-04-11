"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { defaultTransition, easeApple, inViewOpts } from "@/lib/motion";

const steps = [
  {
    num: "01",
    title: "30-minute intro",
    description: "We align on your stakeholders, data boundaries, and what “good” looks like for structured output.",
    duration: "30 min",
  },
  {
    num: "02",
    title: "Live workspace walkthrough",
    description: "You sign in, create a project, and run a real extraction — the same path available in production.",
    duration: "30–45 min",
  },
  {
    num: "03",
    title: "Written next step",
    description: "You receive a short recap with scope options, roadmap fit, and a proposal timeline when it makes sense.",
    duration: "48 hr",
  },
];

export default function BriefingProcess() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section ref={ref} className="section-dark py-28 lg:py-36 border-t border-white/10">
      <div className="container-apple">
        {/* Header */}
        <motion.div
          initial={{ opacity: 1, y: 22 }}
          animate={{ opacity: 1, y: inView ? 0 : 22 }}
          transition={defaultTransition}
          className="max-w-[640px] mb-20"
        >
          <p className="label-text text-[#6e6e73] mb-5">Next</p>
          <h2 className="section-headline text-white">
            Three beats.
          </h2>
        </motion.div>

        {/* Steps with connecting lines */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {/* Connecting lines (desktop only) */}
          <svg
            className="hidden lg:block absolute top-24 left-0 w-full h-2 pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 1000 4"
          >
            <line
              x1="0"
              y1="2"
              x2="1000"
              y2="2"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeDasharray="8,4"
            />
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0071e3" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#0071e3" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0071e3" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>

          {/* Steps */}
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 1, y: 24 }}
              animate={{ opacity: 1, y: inView ? 0 : 24 }}
              transition={{ duration: 0.55, delay: 0.12 * i, ease: easeApple }}
              className="relative bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors"
            >
              {/* Numbered circle */}
              <div className="w-12 h-12 rounded-full bg-[#0071e3] flex items-center justify-center mb-6 flex-shrink-0">
                <span className="text-[18px] font-bold text-white tracking-[-0.02em]">
                  {step.num}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-[18px] font-semibold text-white tracking-[-0.022em] leading-snug mb-3">
                {step.title}
              </h3>
              <p className="text-[14px] text-[#a1a1a6] leading-relaxed tracking-[-0.01em] mb-6">
                {step.description}
              </p>

              {/* Duration badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
                <span className="text-[12px] font-medium text-[#a1a1a6] tracking-[-0.01em]">
                  {step.duration}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 pt-12 border-t border-white/10"
        >
          <p className="text-[17px] font-semibold text-white tracking-[-0.022em]">
            No commitment required. The briefing is free.
          </p>
          <Link href="/#contact" className="btn-primary btn-shine text-[15px] font-medium px-6 py-3 rounded-full relative overflow-hidden inline-flex">
            Schedule your briefing
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

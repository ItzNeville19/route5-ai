"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  defaultTransition,
  easeApple,
  inViewOpts,
  revealY,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

// Simple SVG icons for pain points
const IconLock = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconStall = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <path d="M12 1v6m0 6v4" />
    <path d="M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24" />
    <path d="M1 12h6m6 0h4" />
    <path d="M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
  </svg>
);

const IconCash = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <path d="M3 6h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
    <path d="M3 6h18M3 10h18" />
  </svg>
);

const IconFail = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2v2m0-4h-2V7h2v6z" />
  </svg>
);

const painPoints = [
  {
    icon: IconLock,
    title: "Logic trapped in UIs",
    description: "No clean API to the real workflow.",
  },
  {
    icon: IconStall,
    title: "Agents idle",
    description: "Plans without execution path.",
  },
  {
    icon: IconCash,
    title: "ROI stranded",
    description: "Spend on models, not operations.",
  },
  {
    icon: IconFail,
    title: "Rewrite risk",
    description: "Years, budget, still no ship.",
  },
];

export default function Problem() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section id="problem" ref={ref} className="section-dark py-28 lg:py-36">
      <div className="container-apple">
        {/* Header */}
        <motion.div
          {...revealY(inView, 22)}
          className="max-w-[800px] mb-20 lg:mb-24"
        >
          <p className="label-text text-[#86868b] mb-6">Why</p>
          <h2 className="section-headline text-white mb-6">
            AI stops where legacy context is opaque.
          </h2>
          <p className="text-[17px] text-[#86868b] max-w-[560px] leading-relaxed tracking-[-0.015em]">
            If the work only lives in old systems and scattered threads, models can&apos;t execute — only narrate.
          </p>
        </motion.div>

        {/* Pain points grid — 2x2 layout */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-16 lg:mb-20"
        >
          {painPoints.map((point, idx) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={idx}
                variants={staggerItem}
                className="group glass-card p-8 lg:p-10 hover-lift cursor-default border border-white/10"
              >
                {/* Icon */}
                <div className="mb-6 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-white group-hover:from-blue-500/30 group-hover:to-blue-600/20 transition-colors duration-300">
                  <Icon />
                </div>

                {/* Title */}
                <h3 className="text-[18px] lg:text-[20px] font-semibold text-white tracking-[-0.02em] leading-snug mb-4">
                  {point.title}
                </h3>

                {/* Description */}
                <p className="text-[14px] lg:text-[15px] text-[#86868b] leading-relaxed tracking-[-0.01em]">
                  {point.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom statement with CTA */}
        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: inView ? 0 : 16 }}
          transition={{ ...defaultTransition, delay: 0.45, ease: easeApple }}
          className="border-t border-white/10 pt-12 lg:pt-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8"
        >
          <p className="text-[17px] font-semibold text-white tracking-[-0.02em] max-w-[420px] leading-snug">
            Structure the narrative first. Automate second.
          </p>
          <a
            href="#solution"
            className="btn-primary btn-shine flex-shrink-0 group/btn relative overflow-hidden"
          >
            The how
            <svg
              className="w-4 h-4 transition-transform group-hover/btn:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

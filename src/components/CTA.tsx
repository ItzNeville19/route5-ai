"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="cta"
      ref={ref}
      className="section-dark py-28 lg:py-36 border-t border-white/10 relative overflow-hidden"
    >
      {/* Gradient background with glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0071e3]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-apple relative z-10">
        <div className="grid lg:grid-cols-[1.3fr_auto] gap-16 lg:gap-20 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-white font-bold tracking-[-0.025em] leading-[1.05] mb-6"
              style={{ fontSize: "clamp(40px, 5vw, 60px)" }}
            >
              Bridge the gap between your AI investment and your legacy systems.
            </h2>
            <p className="body-large text-[#a1a1a6] max-w-[600px] mb-4">
              Request a live briefing. We demonstrate Route5 against your actual legacy system and deliver a deployment proposal within 48 hours.
            </p>
            <p className="text-[14px] text-[#6e6e73]">
              On-premise deployment • BYO LLM • SOC 2 Type II certified
            </p>
          </motion.div>

          {/* Right: CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-3 lg:items-end"
          >
            <a
              href="#contact"
              className="btn-primary text-[17px] font-semibold whitespace-nowrap px-8 py-3.5"
            >
              Request a Live Briefing
            </a>
            <a
              href="mailto:enterprise@route5.ai"
              className="px-8 py-3.5 border border-white/20 hover:border-white/40 text-white text-[17px] font-medium rounded-xl transition-colors duration-200 tracking-[-0.022em] text-center whitespace-nowrap hover:bg-white/5"
            >
              enterprise@route5.ai
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

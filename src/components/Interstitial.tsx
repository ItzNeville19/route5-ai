"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { easeApple, inViewOpts } from "@/lib/motion";
import { MARKET_STATS } from "@/lib/market-stats";
import AnimatedMetric from "@/components/effects/AnimatedMetric";

export default function Interstitial() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section
      ref={ref}
      className="section-gradient-dark relative py-28 lg:py-36 border-t border-b border-white/8 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,113,227,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(120,80,255,0.12), transparent)",
        }}
      />

      <div className="container-apple relative z-10">
        <motion.p
          initial={{ opacity: 1, y: 8 }}
          animate={{ opacity: 1, y: inView ? 0 : 8 }}
          transition={{ duration: 0.45, ease: easeApple }}
          className="label-text text-[#86868b] mb-6"
        >
          Scale
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: inView ? 0 : 16 }}
          transition={{ duration: 0.55, ease: easeApple }}
          className="max-w-[920px] mb-16 lg:mb-20"
        >
          <h2 className="section-headline text-white mb-4">
            Billions on the line.
          </h2>
          <p className="text-[15px] text-[#86868b] max-w-[520px] tracking-[-0.01em]">
            Sourced. Click through.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-10 lg:gap-14 border-t border-white/10 pt-12 lg:pt-16">
          {MARKET_STATS.map((stat) => (
            <AnimatedMetric key={stat.id} stat={stat} />
          ))}
        </div>

        <p className="mt-10 text-[11px] text-[#5c5c5c] uppercase tracking-[0.12em]">
          We don&apos;t invent these figures.
        </p>
      </div>
    </section>
  );
}

"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const sectors = [
  { label: "Banking" },
  { label: "Insurance" },
  { label: "Healthcare" },
  { label: "Government" },
  { label: "Asset Management" },
];

const certs = ["SOC 2", "ISO 27001", "GDPR", "HIPAA", "DORA", "PCI DSS"];

export default function TrustBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="section-dark py-20 lg:py-24 border-t border-b"
      style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
    >
      <div className="container-apple">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="label-text text-[#86868b] mb-16"
        >
          Trusted by global enterprises
        </motion.p>

        {/* Infinite marquee scrolling industries */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="relative mb-16 overflow-hidden"
        >
          {/* Marquee wrapper */}
          <div className="flex gap-12 lg:gap-16 whitespace-nowrap animate-none" style={{ width: "auto" }}>
            {/* Duplicate for seamless loop */}
            {[...sectors, ...sectors].map((sector, idx) => (
              <motion.div
                key={`${sector.label}-${idx}`}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="flex-shrink-0"
              >
                <p className="text-[16px] lg:text-[18px] font-medium text-white tracking-[-0.015em]">
                  {sector.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        </motion.div>

        {/* Compliance badges with staggered fade-in */}
        <motion.div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4">
          {certs.map((cert, idx) => (
            <motion.span
              key={cert}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{
                duration: 0.4,
                delay: 0.3 + idx * 0.08,
                ease: "easeOut",
              }}
              className="px-3.5 py-2 text-[12px] font-medium text-white border border-white/15 rounded-full tracking-[-0.01em] backdrop-blur-sm hover:border-white/30 hover:bg-white/5 transition-all duration-300"
            >
              {cert}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

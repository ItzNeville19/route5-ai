"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { easeApple, inViewOpts } from "@/lib/motion";

const sectors = [
  { label: "Banking" },
  { label: "Insurance" },
  { label: "Healthcare" },
  { label: "Government" },
  { label: "Asset Management" },
];

export default function TrustBar() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section
      ref={ref}
      className="section-dark py-20 lg:py-24 border-t border-b"
      style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
    >
      <div className="container-apple">
        <motion.p
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="label-text text-[#86868b] mb-6 max-w-[720px]"
        >
          Verticals
        </motion.p>

        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-10 overflow-hidden"
        >
          <div className="flex gap-12 lg:gap-16 whitespace-nowrap flex-wrap">
            {[...sectors, ...sectors].map((sector, idx) => (
              <motion.div
                key={`${sector.label}-${idx}`}
                initial={{ opacity: 1, y: 6 }}
                animate={{ opacity: 1, y: inView ? 0 : 6 }}
                transition={{ duration: 0.45, delay: idx * 0.04, ease: easeApple }}
                className="flex-shrink-0"
              >
                <p className="text-[16px] lg:text-[18px] font-medium text-white tracking-[-0.015em]">
                  {sector.label}
                </p>
              </motion.div>
            ))}
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        </motion.div>

        <p className="text-[12px] text-[#6e6e73] max-w-[560px] tracking-[-0.01em]">
          Certifications = paper trail, not hero badges. Ask under NDA.
        </p>
      </div>
    </section>
  );
}

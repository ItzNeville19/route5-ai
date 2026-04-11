"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { defaultTransition, easeApple, inViewOpts } from "@/lib/motion";

const principles = [
  {
    title: "Truth in packaging",
    body: "Every page lists what runs in production versus what is roadmap. No borrowed logos, no fake compliance badges.",
  },
  {
    title: "Operators first",
    body: "We optimize for people who carry pager risk — clear states, honest errors, and flows that still work when the model is down.",
  },
  {
    title: "Stepwise delivery",
    body: "Ship a narrow workflow, earn trust, then expand into connectors and generated code. Big bang launches are where enterprise projects go to die.",
  },
];

export default function Credibility() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section
      ref={ref}
      className="border-t border-white/10 bg-black py-28 lg:py-36"
    >
      <div className="container-apple">

        <motion.div
          initial={{ opacity: 1, y: 22 }}
          animate={{ opacity: 1, y: inView ? 0 : 22 }}
          transition={defaultTransition}
          className="max-w-[700px] mb-16"
        >
          <p className="label-text text-[#a1a1a6] mb-5">Principles</p>
          <h2 className="text-[clamp(36px,6vw,56px)] font-bold tracking-[-0.04em] leading-[1.02] text-white">
            Proof over posture.
          </h2>
          <p className="mt-4 text-[15px] text-[#86868b] max-w-[420px]">
            Verify in the app.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6">
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 1, y: 16 }}
              animate={{ opacity: 1, y: inView ? 0 : 16 }}
              transition={{ duration: 0.5, delay: 0.1 * i, ease: easeApple }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 hover:border-white/20 transition-all duration-300"
            >
              <h3 className="text-[17px] font-semibold text-white tracking-[-0.02em] mb-3">
                {p.title}
              </h3>
              <p className="text-[14px] text-[#a1a1a6] leading-relaxed">
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

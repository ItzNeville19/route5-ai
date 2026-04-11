"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { defaultTransition, easeApple, inViewOpts } from "@/lib/motion";

/** Themes from real enterprise conversations — not attributed testimonials. */
const themes = [
  {
    title: "Alignment under pressure",
    body: "Leaders want one narrative before they fund the next phase. They are tired of reconciling five versions of what we decided.",
  },
  {
    title: "Audit without theater",
    body: "Risk and ops teams ask for evidence that humans reviewed AI output. A durable project record answers that without extra tooling.",
  },
  {
    title: "A path to automation",
    body: "Engineering wants structured inputs before they commit to APIs or agents. Text-in / structured-out is the smallest honest first step.",
  },
];

export default function Testimonials() {
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
          className="max-w-[700px] mb-8"
        >
          <p className="label-text text-[#a1a1a6] mb-5">Signal</p>
          <h2 className="text-[clamp(36px,6vw,56px)] font-bold tracking-[-0.04em] leading-[1.02] text-white">
            What we hear.
          </h2>
          <p className="mt-4 text-[15px] text-[#86868b] max-w-[420px]">
            Themes — not paid quotes.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {themes.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 1, y: 24 }}
              animate={{ opacity: 1, y: inView ? 0 : 24 }}
              transition={{ duration: 0.55, delay: 0.1 * i, ease: easeApple }}
              className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm p-8 flex flex-col hover:border-white/20 transition-all duration-300"
            >
              <h3 className="text-[18px] font-semibold text-white tracking-[-0.02em] mb-4">
                {t.title}
              </h3>
              <p className="text-[15px] text-[#c4c4c9] leading-relaxed tracking-[-0.01em]">
                {t.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

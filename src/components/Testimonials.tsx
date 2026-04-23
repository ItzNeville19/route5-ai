"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { defaultTransition, easeApple, inViewOpts } from "@/lib/motion";

/** Customer themes we hear in discovery — composite, not individual quotes. */
const themes = [
  {
    title: "Alignment under pressure",
    body: "Leaders need a single view of what was decided and who owns the next step before the next budget or board cycle.",
  },
  {
    title: "Review-ready records",
    body: "Risk and operations teams need a durable project log that shows what was captured, when, and by whom—without standing up another system.",
  },
  {
    title: "Automation-ready inputs",
    body: "Engineering teams want consistent structured fields before they invest in deeper integrations and agents.",
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

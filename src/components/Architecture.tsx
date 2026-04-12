"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import {
  easeApple,
  defaultTransition,
  inViewOpts,
  scaleInCard,
  staggerContainer,
  staggerItemTight,
} from "@/lib/motion";

const before = [
  "Decisions buried in long threads and forwards",
  "No single summary stakeholders can all point to",
  "Action items tracked in spreadsheets or memory",
  "Context lost when people rotate or vendors change",
];

const after = [
  { text: "Paste the raw text as it exists today", type: "normal" },
  { text: "Route5 produces a concise summary + decision list", type: "normal" },
  { text: "Action items are explicit and checkable in the app", type: "success" },
  { text: "History stays attached to the project for audits", type: "normal" },
];

export default function Architecture() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section ref={ref} className="section-dark py-28 lg:py-36 relative overflow-hidden">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 1, y: 22 }}
          animate={{ opacity: 1, y: inView ? 0 : 22 }}
          transition={defaultTransition}
          className="max-w-[700px] mb-20"
        >
          <p className="label-text text-[#6e6e73] mb-5">Before / after</p>
          <h2 className="section-headline text-white">
            One structured record per project.
          </h2>
          <p className="mt-5 text-[16px] text-[#86868b] max-w-[440px]">
            Structure now. Automate later.
          </p>
        </motion.div>

        <motion.div
          className="grid lg:grid-cols-2 gap-8 lg:gap-10 mb-12"
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div
            variants={scaleInCard}
            className="rounded-2xl border border-[#404043] overflow-hidden bg-gradient-to-br from-[#1d1d1f] to-[#000] shadow-2xl"
          >
            <div className="px-8 py-6 bg-gradient-to-r from-[#404043]/40 to-transparent border-b border-[#404043] flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-3 h-3 rounded-full bg-red-500/80 flex-shrink-0"
              />
              <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                Without a shared record
              </p>
            </div>

            <div className="divide-y divide-[#404043]">
              {before.map((step, i) => (
                <motion.div
                  key={i}
                  variants={staggerItemTight}
                  className="flex items-start gap-4 px-8 py-5 hover:bg-white/[0.03] transition-colors duration-200"
                >
                  <span className="text-[13px] font-mono text-[#6e6e73] flex-shrink-0 w-6 pt-0.5 font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-[14px] text-[#86868b] leading-relaxed tracking-[-0.01em]">
                    {step}
                  </span>
                </motion.div>
              ))}

              <div className="px-8 py-6 bg-red-500/10 border-t border-red-500/20">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                  <p className="text-[13px] text-red-300/90 font-medium tracking-[-0.01em]">
                    Teams burn cycles reconciling narratives instead of shipping.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={scaleInCard}
            className="rounded-2xl border border-[#0071e3]/40 overflow-hidden bg-gradient-to-br from-[#0a1f3d] to-[#000] shadow-2xl shadow-[#0071e3]/20"
          >
            <div className="px-8 py-6 bg-gradient-to-r from-[#0071e3]/20 to-transparent border-b border-[#0071e3]/30 flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
                className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0"
              />
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-wider">
                With Route5 (live workflow)
              </p>
            </div>

            <div className="divide-y divide-[#0071e3]/20">
              {after.map((step, i) => (
                <motion.div
                  key={i}
                  variants={staggerItemTight}
                  className={`flex items-start gap-4 px-8 py-5 transition-colors duration-200 ${
                    step.type === "success" ? "bg-green-500/10" : "hover:bg-[#0071e3]/5"
                  }`}
                >
                  <span className="text-[13px] font-mono text-[#0071e3] flex-shrink-0 w-6 pt-0.5 font-semibold">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2 w-full">
                    <span
                      className={`text-[14px] leading-relaxed tracking-[-0.01em] ${
                        step.type === "success" ? "text-green-300 font-medium" : "text-[#86868b]"
                      }`}
                    >
                      {step.text}
                    </span>
                    {step.type === "success" && (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              ))}

              <div className="px-8 py-6 bg-[#0071e3]/10 border-t border-[#0071e3]/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3] flex-shrink-0 mt-1" />
                  <p className="text-[13px] text-[#0071e3]/90 font-medium tracking-[-0.01em]">
                    Stakeholders can reference the same saved extraction in Route5 — fewer conflicting narratives.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: inView ? 0 : 10 }}
          transition={{ duration: 0.5, delay: 0.5, ease: easeApple }}
          className="flex justify-center lg:hidden mb-8"
        >
          <ArrowRight className="w-6 h-6 text-[#0071e3] rotate-90" />
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: inView ? 0 : 16 }}
          transition={{ duration: 0.55, delay: 0.65, ease: easeApple }}
          className="mt-12 p-10 rounded-2xl border border-[#0071e3]/30 bg-gradient-to-r from-[#0071e3]/10 to-transparent backdrop-blur-sm"
        >
          <h3 className="text-lg font-semibold text-white tracking-[-0.022em] mb-4">
            Why this order matters
          </h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <ArrowRight className="w-5 h-5 text-[#0071e3] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-medium text-white mb-1">Cognitive clarity</p>
                <p className="text-[13px] text-[#86868b]">
                  People finish faster when outcomes are visible — the brain rewards completion, not noise.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-medium text-white mb-1">Honest automation path</p>
                <p className="text-[13px] text-[#86868b]">
                  Structured records become the spec for APIs and agents later — without rewriting history.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

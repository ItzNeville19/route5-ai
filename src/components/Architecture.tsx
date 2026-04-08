"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const before = [
  "Human operator logs into legacy trade system",
  "Navigates through 8 sequential screens in precise order",
  "Manually enters trade details and counterparty data",
  "Waits for system validation — monitors confirmation screen",
  "Submits transaction, checks result manually",
  "Verifies database write and audit log entry",
];

const after = [
  { text: "AI agent receives instruction to book a trade", type: "normal" },
  { text: 'BookTrade({ symbol: "AAPL", qty: 1000, side: "BUY" })', type: "mono" },
  { text: "Route5 orchestrates the full legacy execution path invisibly", type: "normal" },
  { text: "Validation passed · Database committed · Audit log confirmed", type: "success" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6 },
  },
};

export default function Architecture() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="section-dark py-28 lg:py-36 relative overflow-hidden">
      <div className="container-apple">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="max-w-[700px] mb-20"
        >
          <p className="label-text text-[#6e6e73] mb-5">The Transformation</p>
          <h2 className="section-headline text-white">
            Replace human clicks with AI execution.
          </h2>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          className="grid lg:grid-cols-2 gap-8 lg:gap-10 mb-12"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* Before Card */}
          <motion.div
            variants={cardVariants}
            className="rounded-2xl border border-[#404043] overflow-hidden bg-gradient-to-br from-[#1d1d1f] to-[#000] shadow-2xl"
          >
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-[#404043]/40 to-transparent border-b border-[#404043] flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-3 h-3 rounded-full bg-red-500/80 flex-shrink-0"
              />
              <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                Without Route5 — Today
              </p>
            </div>

            {/* Content */}
            <div className="divide-y divide-[#404043]">
              {before.map((step, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
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

              {/* Footer stats */}
              <div className="px-8 py-6 bg-red-500/10 border-t border-red-500/20">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                  <p className="text-[13px] text-red-300/90 font-medium tracking-[-0.01em]">
                    15–30 minutes per transaction · Error-prone · Unscalable · Zero automation possible
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* After Card */}
          <motion.div
            variants={cardVariants}
            className="rounded-2xl border border-[#0071e3]/40 overflow-hidden bg-gradient-to-br from-[#0a1f3d] to-[#000] shadow-2xl shadow-[#0071e3]/20"
          >
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-[#0071e3]/20 to-transparent border-b border-[#0071e3]/30 flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
                className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0"
              />
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-wider">
                With Route5 — After Deployment
              </p>
            </div>

            {/* Content */}
            <div className="divide-y divide-[#0071e3]/20">
              {after.map((step, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className={`flex items-start gap-4 px-8 py-5 transition-colors duration-200 ${
                    step.type === "success" ? "bg-green-500/10" : "hover:bg-[#0071e3]/5"
                  }`}
                >
                  <span className="text-[13px] font-mono text-[#0071e3] flex-shrink-0 w-6 pt-0.5 font-semibold">
                    {i + 1}
                  </span>

                  {step.type === "mono" ? (
                    <motion.code
                      whileHover={{ scale: 1.01 }}
                      className="text-[12.5px] font-mono text-[#e8f4f8] bg-[#001d3d]/60 border border-[#0071e3]/30 px-4 py-3 rounded-lg leading-relaxed block w-full backdrop-blur-sm"
                    >
                      {step.text}
                    </motion.code>
                  ) : (
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
                  )}
                </motion.div>
              ))}

              {/* Footer stats */}
              <div className="px-8 py-6 bg-[#0071e3]/10 border-t border-[#0071e3]/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3] flex-shrink-0 mt-1" />
                  <p className="text-[13px] text-[#0071e3]/90 font-medium tracking-[-0.01em]">
                    Sub-second execution · Deterministic · Infinitely scalable · Fully auditable
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Arrow transition indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex justify-center lg:hidden mb-8"
        >
          <ArrowRight className="w-6 h-6 text-[#0071e3] rotate-90" />
        </motion.div>

        {/* Benefits callout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.8 }}
          className="mt-12 p-10 rounded-2xl border border-[#0071e3]/30 bg-gradient-to-r from-[#0071e3]/10 to-transparent backdrop-blur-sm"
        >
          <h3 className="text-lg font-semibold text-white tracking-[-0.022em] mb-4">
            The Route5 Advantage
          </h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <ArrowRight className="w-5 h-5 text-[#0071e3] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-medium text-white mb-1">AI-Callable APIs</p>
                <p className="text-[13px] text-[#86868b]">Direct AI agent invocation without any UI interaction</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-medium text-white mb-1">Verified Parity</p>
                <p className="text-[13px] text-[#86868b]">Automated validation ensures behavioral equivalence</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

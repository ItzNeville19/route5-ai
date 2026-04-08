"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const testimonials = [
  {
    quote:
      "From legacy COBOL trade booking to AI-callable MCP tool in 4 days. Zero production changes.",
    name: "Chief Technology Officer",
    company: "Tier 1 Global Investment Bank",
    companyType: "Global Investment Bank",
    metric: "4 days",
    metricLabel: "to first production-ready MCP tool",
  },
  {
    quote:
      "Route5 gave our AI copilot access to 15 years of embedded business logic without a single line of code change.",
    name: "VP of Engineering",
    company: "Fortune 100 Insurance Group",
    companyType: "Insurance Group",
    metric: "15 yrs",
    metricLabel: "of legacy logic unlocked instantly",
  },
  {
    quote:
      "97% parity pass rate on the first extraction cycle. Our compliance team approved deployment in 48 hours.",
    name: "Chief Information Security Officer",
    company: "Top 5 US Healthcare Payer",
    companyType: "Healthcare Payer",
    metric: "97%",
    metricLabel: "parity validation on first cycle",
  },
];

export default function Testimonials() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-[#1d1d1f] py-28 lg:py-36">
      <div className="container-apple">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="max-w-[700px] mb-16"
        >
          <p className="label-text text-[#a1a1a6] mb-5">Customer Outcomes</p>
          <h2 className="text-[56px] lg:text-[68px] font-bold tracking-[-0.04em] leading-tight text-white">
            Proven at the world's most demanding institutions.
          </h2>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.company}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.12 * i }}
              className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm p-8 flex flex-col hover:border-white/20 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/0 transition-all duration-300"
            >
              {/* Decorative Quote Mark */}
              <div className="absolute top-6 right-6 text-white/20 text-6xl leading-none font-light">
                "
              </div>

              {/* Metric Highlight */}
              <div className="mb-8">
                <div className="text-[44px] lg:text-[52px] font-bold text-[#0071e3] tracking-[-0.03em] leading-none mb-2">
                  {t.metric}
                </div>
                <div className="text-[13px] text-[#a1a1a6] tracking-[-0.01em] leading-snug">
                  {t.metricLabel}
                </div>
              </div>

              {/* Quote */}
              <blockquote className="flex-1 text-[16px] text-[#f5f5f7] leading-relaxed tracking-[-0.01em] mb-8 font-medium">
                "{t.quote}"
              </blockquote>

              {/* Attribution */}
              <div className="border-t border-white/10 pt-6">
                <p className="text-[14px] font-semibold text-white tracking-[-0.018em]">
                  {t.name}
                </p>
                <p className="text-[13px] text-[#a1a1a6] mt-1">
                  {t.company}
                </p>
                <p className="text-[12px] text-[#86868b] mt-2">
                  {t.companyType}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Disclosure */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-12 text-[13px] text-[#86868b] leading-relaxed max-w-2xl"
        >
          Customer identities are confidential at client request, consistent with standard enterprise
          NDA requirements. References and case studies available for qualified enterprise inquiries.
        </motion.p>
      </div>
    </section>
  );
}

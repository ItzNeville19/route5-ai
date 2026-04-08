"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface Metric {
  value: string;
  label: string;
  sub: string;
  isNumeric?: boolean;
  numericValue?: number;
  numericSuffix?: string;
}

const metrics: Metric[] = [
  { value: "< 1 week", label: "Time to First AI-Callable Capability",      sub: "From onboarding to a working, validated API" },
  { value: "95%+",     label: "Parity Validation Pass Rate",     sub: "Behavioral equivalence confirmed before deployment", isNumeric: true, numericValue: 95, numericSuffix: "%" },
  { value: "70%+",     label: "Reduction in Manual Operator Steps",        sub: "AI agents replace human click-through workflows", isNumeric: true, numericValue: 70, numericSuffix: "%" },
  { value: "100x",      label: "Faster Than Traditional Modernization",  sub: "Weeks to first delivery, not years", isNumeric: true, numericValue: 100, numericSuffix: "x" },
  { value: "80%",      label: "Cost Reduction vs. Full Rewrite",        sub: "Enterprise SaaS pricing vs. $10M–$100M+ engagements", isNumeric: true, numericValue: 80, numericSuffix: "%" },
  { value: "5+",       label: "AI Use Cases Enabled Per Customer",         sub: "Within the first six months of deployment" },
];

const comparison = [
  { category: "Approach",         traditional: "Full rewrite or RPA screen scraping",             route5: "Extraction & wrapping" },
  { category: "Timeline",         traditional: "Years",                     route5: "Weeks" },
  { category: "Production Risk",  traditional: "High (downtime, regression risk)",         route5: "Zero production impact" },
  { category: "Cost",             traditional: "$10M–$100M+",               route5: "Fraction of rewrite" },
  { category: "AI Readiness",     traditional: "Requires separate integration",         route5: "Immediate MCP/API output" },
  { category: "Validation",       traditional: "Manual QA",             route5: "Automated parity testing" },
  { category: "Data Sovereignty", traditional: "Cloud dependency",          route5: "On-premise, BYO LLM" },
];

function CountUpValue({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;

    const duration = 2.5;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      setCount(Math.floor(progress * target));

      if (progress === 1) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [inView, target]);

  return (
    <div ref={ref}>
      {count}
      {suffix}
    </div>
  );
}

export default function Metrics() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="roi" ref={ref} className="section-light bg-[#f5f5f7] py-28 lg:py-36">
      <div className="container-apple">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="max-w-[700px] mb-16"
        >
          <p className="label-text text-[#6e6e73] mb-5">Measurable Impact</p>
          <h2 className="section-headline text-[#1d1d1f]">
            ROI you can measure in weeks, not years.
          </h2>
          <p className="mt-6 body-large text-[#6e6e73]">
            Route5 is built around measurable outcomes. Every engagement begins
            with a defined capability target and ends with validated, deployed
            AI interfaces — on a timeline your business can act on.
          </p>
        </motion.div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-[#d2d2d7] border border-[#d2d2d7] rounded-2xl overflow-hidden mb-16">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.07 * i }}
              className="bg-white px-8 py-8"
            >
              <div className="text-[40px] lg:text-[48px] font-bold text-[#0071e3] tracking-[-0.03em] leading-none mb-3">
                {m.isNumeric ? (
                  <CountUpValue target={m.numericValue || 0} suffix={m.numericSuffix || ""} />
                ) : (
                  m.value
                )}
              </div>
              <div className="text-[14px] font-semibold text-[#1d1d1f] mb-1.5 leading-snug tracking-[-0.018em]">
                {m.label}
              </div>
              <div className="text-[13px] text-[#6e6e73] leading-snug">
                {m.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-[-0.022em] mb-8">
            Route5 vs. Traditional Modernization
          </h3>

          <div className="rounded-2xl border border-[#d2d2d7] overflow-hidden bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d2d2d7] bg-[#f5f5f7]">
                  <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider w-1/4" />
                  <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider">
                    Traditional Approach
                  </th>
                  <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#0071e3] uppercase tracking-wider bg-blue-50">
                    Route5
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {comparison.map((row) => (
                  <tr key={row.category} className="hover:bg-[#fafafa] transition-colors">
                    <td className="py-4 px-6 text-[13px] font-semibold text-[#1d1d1f] tracking-[-0.01em]">
                      {row.category}
                    </td>
                    <td className="py-4 px-6 text-[13px] text-[#6e6e73] tracking-[-0.01em]">
                      {row.traditional}
                    </td>
                    <td className="py-4 px-6 text-[13px] text-[#1d1d1f] font-medium tracking-[-0.01em] bg-blue-50">
                      {row.route5}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

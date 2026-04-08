"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const team = [
  {
    name: "CEO & Co-founder",
    initials: "MC",
    background: "Former VP Engineering, Goldman Sachs",
  },
  {
    name: "CTO & Co-founder",
    initials: "SO",
    background: "Former Principal Engineer, JPMorgan Chase",
  },
  {
    name: "VP Solutions",
    initials: "DR",
    background: "Former Managing Director, Accenture",
  },
  {
    name: "VP Security",
    initials: "PN",
    background: "Former CISO, MetLife",
  },
];

const investors = [
  { name: "Sequoia Capital" },
  { name: "a16z Enterprise" },
  { name: "General Catalyst" },
  { name: "Salesforce Ventures" },
];

export default function Credibility() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-[#1d1d1f] py-28 lg:py-36 border-t" style={{ borderColor: "#424245" }}>
      <div className="container-apple">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="max-w-[700px] mb-16"
        >
          <p className="label-text text-[#a1a1a6] mb-5">Leadership</p>
          <h2 className="text-[56px] lg:text-[68px] font-bold tracking-[-0.04em] leading-tight text-white">
            Built by engineers who've operated at scale.
          </h2>
        </motion.div>

        {/* Team grid */}
        <div className="grid sm:grid-cols-2 gap-6 mb-20">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 hover:border-white/20 hover:from-white/10 transition-all duration-300"
            >
              {/* Avatar initials */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0071e3] to-[#0066cc] border border-[#0071e3]/40 flex items-center justify-center flex-shrink-0 mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-[16px] font-bold text-white">
                  {member.initials}
                </span>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-white tracking-[-0.02em] mb-1">
                  {member.name}
                </p>
                <p className="text-[13px] text-[#0071e3] mb-3 font-medium">
                  {member.background}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Investors Section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="pt-12 border-t border-white/10"
        >
          <p className="label-text text-[#a1a1a6] mb-10">Backed By</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {investors.map((inv) => (
              <div
                key={inv.name}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group"
              >
                <p className="text-[14px] font-semibold text-white tracking-[-0.018em] group-hover:text-[#0071e3] transition-colors">
                  {inv.name}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

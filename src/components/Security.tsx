"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const controls = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m7-4a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Behavioral Parity Validation",
    description:
      "Comprehensive output comparison ensures generated capabilities match legacy system behavior exactly before approval.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.4 15a1.65 1.65 0 00.33-1.82l-.756-1.514a1.65 1.65 0 00-1.597-.821c-.047 0-.098 0-.146.02-.505.087-.89.379-1.23.784-.28.361-.646.724-1.149.724-.504 0-.87-.363-1.15-.724-.34-.405-.725-.697-1.23-.784a1.666 1.666 0 00-1.597.821l-.755 1.514a1.65 1.65 0 00.33 1.82c.24.24.545.453.852.62.31.17.63.28.975.28s.665-.11.975-.28c.307-.167.612-.38.852-.62zM4.6 9a1.65 1.65 0 00-.33 1.82l.756 1.514a1.65 1.65 0 001.597.821c.047 0 .098 0 .146-.02.505-.087.89-.379 1.23-.784.28-.361.646-.724 1.149-.724.504 0 .87.363 1.15.724.34.405.725.697 1.23.784.05.02.099.02.146.02.617 0 1.185-.301 1.597-.821l.755-1.514A1.65 1.65 0 0019.4 9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Role-Based Agent Authentication",
    description:
      "Bot identity maps to legacy system roles. Agents operate only within permitted business boundaries.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Throttling & Execution Guardrails",
    description:
      "Configurable rate limits and execution boundaries prevent AI agents from overwhelming legacy infrastructure.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12h6m-6 4h6m2-15H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V3a2 2 0 00-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Complete Audit Logging",
    description:
      "Evidence → facts → AI proposals → human decisions → parity reports. Full lineage from legacy source to artifact.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "PII & Data Protection",
    description:
      "Sensitive data masking and encryption at every layer. Automatic detection and protection during trace capture.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Transaction Integrity",
    description:
      "Boundary protection with automatic rollback capability. AI agents cannot bypass transactional guarantees.",
  },
];

const certs = [
  { name: "SOC 2 Type II",  desc: "Annual third-party audit" },
  { name: "ISO 27001",      desc: "Information security management" },
  { name: "GDPR",           desc: "EU data protection compliance" },
  { name: "HIPAA",          desc: "Healthcare data standards" },
  { name: "DORA",           desc: "Digital operational resilience" },
  { name: "PCI DSS",        desc: "Payment card industry standards" },
];

export default function Security() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="security" ref={ref} className="section-dark py-28 lg:py-36">
      <div className="container-apple">

        {/* Header row */}
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 items-start mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55 }}
          >
            <p className="label-text text-[#6e6e73] mb-5">Enterprise Security</p>
            <h2 className="section-headline text-white">
              Safety is a first-class design principle.
            </h2>
          </motion.div>

          {/* On-premise callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="lg:pt-8"
          >
            <div className="relative rounded-2xl border border-[#0071e3]/25 bg-gradient-to-br from-[#0071e3]/8 via-[#001d3d]/20 to-transparent backdrop-blur-sm p-8 mb-8 overflow-hidden group">
              {/* Subtle animated border glow */}
              <div className="absolute inset-0 rounded-2xl border border-[#0071e3]/10 group-hover:border-[#0071e3]/40 transition-colors duration-300" />

              <div className="relative">
                <p className="text-[17px] font-semibold text-white tracking-[-0.022em] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0071e3]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                  All Components Run In-Premise
                </p>
                <p className="text-[14px] text-[#86868b] leading-relaxed tracking-[-0.01em]">
                  No source code, execution traces, or business data ever leaves your environment. Bring your own LLM — Azure OpenAI, AWS Bedrock, or self-hosted.
                </p>
              </div>
            </div>

            {/* Cert badges */}
            <div className="grid grid-cols-3 gap-3">
              {certs.map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.25 + (i * 0.05) }}
                  whileHover={{ y: -2 }}
                  className="rounded-xl bg-white/4 border border-white/8 hover:border-white/20 px-4 py-3.5 transition-colors duration-300 cursor-default"
                >
                  <p className="text-[13px] font-semibold text-white tracking-[-0.01em] mb-0.5">{c.name}</p>
                  <p className="text-[11px] text-[#6e6e73] leading-snug">{c.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Controls grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {controls.map((ctrl, i) => (
            <motion.div
              key={ctrl.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.05 * i }}
              whileHover={{ y: -4 }}
              className="group relative bg-[#1d1d1f] rounded-[20px] p-8 border border-white/8 overflow-hidden transition-all duration-300 hover:border-white/16"
            >
              {/* Subtle gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3]/3 via-transparent to-[#0071e3]/1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Icon container with shield aesthetic */}
              <div className="relative mb-6 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0071e3]/10 group-hover:bg-[#0071e3]/20 text-[#0071e3] transition-colors duration-300">
                {ctrl.icon}
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="text-[17px] font-semibold text-white tracking-[-0.022em] mb-3 leading-snug">
                  {ctrl.title}
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed tracking-[-0.01em]">
                  {ctrl.description}
                </p>
              </div>

              {/* Border glow effect */}
              <div className="absolute inset-0 rounded-[20px] border border-[#0071e3]/0 group-hover:border-[#0071e3]/15 transition-colors duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

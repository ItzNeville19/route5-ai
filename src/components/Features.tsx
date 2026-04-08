"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Multi-Signal Extraction Engine",
    description:
      "Captures source code, runtime traces, and UI workflows for high-fidelity execution models. Dramatically more accurate than static analysis alone.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 2v7h7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12h6M9 16h6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "MCP Server Generation",
    description:
      "Auto-generates MCP servers and tools for direct AI agent orchestration. No UI interaction required, safe and deterministic at scale.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Multiple Output Formats",
    description:
      "REST APIs, gRPC, Python SDKs, microservices, message-driven endpoints — generated in your preferred language and framework.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-1.946c.483.978.978.978 1.946-.483.978.978.978.978 1.946.483.483.978 0 1.946-1.946 1.946m-9.672 0a3.42 3.42 0 001.946-1.946c.483.978.978.978 1.946-.483.978.978.978.978 1.946.483.483.978 0 1.946-1.946 1.946m6.25 8.75l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Automated Parity Validation",
    description:
      "Behavioral comparison ensures generated capabilities match legacy system output exactly across all observable dimensions.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Enterprise Guardrails",
    description:
      "Input validation, business rules, rate limiting, auth, PII masking, transaction rollback — all derived from captured traces.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Built-In Observability",
    description:
      "OpenTelemetry tracing, structured logging, metrics collection, and distributed tracing shipped out of the box.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Human-in-the-Loop Governance",
    description:
      "Mandatory review and approval before any capability goes live. Full audit trail from legacy source to deployed artifact.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 2v7h7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Comprehensive Test Generation",
    description:
      "Unit tests, integration tests, and parity tests auto-generated from traces. Performance benchmarks and security scans included.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.41 7.41L12 10.83 8.59 7.41 7.41 8.59 10.83 12l-3.42 3.41 1.18 1.18L12 13.17l3.41 3.42 1.18-1.18L13.17 12l3.42-3.41-1.18-1.18z" fill="currentColor"/>
      </svg>
    ),
    title: "Zero Production Impact",
    description:
      "Non-invasive read-only access. No production code changes. Instrumentation in test environments only.",
  },
];

export default function Features() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="capabilities" ref={ref} className="section-gray py-28 lg:py-36">
      <div className="container-apple">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="max-w-[700px] mb-20"
        >
          <p className="label-text text-[#6e6e73] mb-5">Platform Capabilities</p>
          <h2 className="section-headline text-[#1d1d1f]">
            Everything you need to make legacy systems AI-ready.
          </h2>
        </motion.div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.04 * i }}
              whileHover={{ y: -4 }}
              className="group relative bg-white rounded-[20px] p-8 border border-[#d2d2d7] overflow-hidden transition-all duration-300 hover:border-[#0071e3]/40 hover:shadow-xl"
            >
              {/* Subtle gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3]/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Icon */}
              <div className="relative mb-5 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#f5f5f7] group-hover:bg-[#0071e3] text-[#1d1d1f] group-hover:text-white transition-colors duration-300">
                {f.icon}
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.022em] mb-3 leading-snug">
                  {f.title}
                </h3>
                <p className="text-[14px] text-[#6e6e73] leading-relaxed tracking-[-0.01em]">
                  {f.description}
                </p>
              </div>

              {/* Border glow effect */}
              <div className="absolute inset-0 rounded-[20px] border border-[#0071e3]/0 group-hover:border-[#0071e3]/20 transition-colors duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

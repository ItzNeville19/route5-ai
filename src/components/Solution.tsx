"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Plug, Radar, Sparkles, Package, ShieldCheck } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Connect",
    description: "Point Route5 at your legacy codebase and test environment",
    icon: Plug,
    detail: "Java 6–21 · .NET Framework & Core · Spring · Hibernate · EJB · Oracle · SQL Server · PostgreSQL · MySQL · Sybase",
  },
  {
    num: "02",
    title: "Capture",
    description: "Platform captures execution flows across source code, runtime signals, and user workflows",
    icon: Radar,
    detail: "Static code analysis + runtime execution signals + user workflow recording fused into a single high-fidelity execution model.",
  },
  {
    num: "03",
    title: "Analyze",
    description: "AI analyzes traces, infers business logic, generates orchestrated capability wrapper",
    icon: Sparkles,
    detail: "Merges all execution paths into a single validated capability. Surfaces ambiguity for human review before proceeding.",
  },
  {
    num: "04",
    title: "Produce",
    description: "System produces APIs, MCP tools, tests, guardrails, observability, and parity validation",
    icon: Package,
    detail: "Full test suite · Guardrails · Observability instrumentation · OpenAPI documentation · Architecture diagrams included.",
  },
  {
    num: "05",
    title: "Validate & Deploy",
    description: "Human-in-the-loop review, parity validation, safe deployment",
    icon: ShieldCheck,
    detail: "API responses · Database state · External calls · File outputs · Side effects — all compared. 95%+ equivalence required.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const lineVariants = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 1.2 },
  },
};

export default function Solution() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="solution" ref={ref} className="section-dark py-28 lg:py-36 relative overflow-hidden">
      <div className="container-apple">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="max-w-[700px] mb-24"
        >
          <p className="label-text text-[#6e6e73] mb-5">The Platform</p>
          <h2 className="section-headline text-white">
            From legacy workflows to AI-callable capabilities.
          </h2>
        </motion.div>

        {/* Timeline Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative"
        >
          {/* Animated vertical line */}
          <div className="hidden lg:block absolute left-[39px] top-12 bottom-0 w-px">
            <motion.div
              variants={lineVariants}
              className="w-full h-full origin-top bg-gradient-to-b from-[#0071e3] via-[#0071e3]/50 to-transparent"
              style={{ transformOrigin: "top" }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-8 lg:space-y-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  variants={itemVariants}
                  className="relative"
                >
                  <div className="grid lg:grid-cols-[90px_1fr] gap-8 lg:gap-12">
                    {/* Icon circle + number */}
                    <div className="flex flex-col items-center lg:items-start">
                      <div className="relative z-10 mb-4 lg:mb-0">
                        <motion.div
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0071e3] to-[#0071e3]/70 flex items-center justify-center shadow-lg shadow-[#0071e3]/25"
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />
                        </motion.div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#1d1d1f] border-2 border-[#0071e3] flex items-center justify-center text-[11px] font-semibold text-[#0071e3] tracking-tight">
                          {step.num}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-2">
                      <h3 className="text-2xl font-semibold text-white tracking-[-0.022em] mb-3">
                        {step.title}
                      </h3>
                      <p className="text-[15px] text-[#86868b] leading-relaxed tracking-[-0.01em] mb-6">
                        {step.description}
                      </p>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
                        <p className="text-[12px] font-mono text-[#6e6e73] leading-relaxed">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer callout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.8 }}
          className="mt-16 lg:mt-24 p-8 lg:p-10 rounded-2xl border border-[#0071e3]/20 bg-gradient-to-r from-[#001d3d]/40 to-[#001d3d]/20 backdrop-blur-sm"
        >
          <p className="text-lg lg:text-[19px] font-semibold text-white tracking-[-0.022em] mb-3">
            The legacy system continues operating exactly as before.
          </p>
          <p className="text-[15px] text-[#86868b] tracking-[-0.01em]">
            Route5 creates a validated AI interaction layer on top — no production code changes, no deployment risk, no downtime.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

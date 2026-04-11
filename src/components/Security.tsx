"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { defaultTransition, easeApple, inViewOpts } from "@/lib/motion";

const liveControls = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Authenticated access",
    description:
      "Clerk sign-in. API routes reject unauthenticated calls. Projects and extractions are tied to your user ID.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Transport security",
    description:
      "Browser traffic uses HTTPS. Secrets (Clerk, Supabase service role, OpenAI) stay on the server — never shipped to the client.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Tenant-scoped data",
    description:
      "Postgres rows include your Clerk user ID. You only read and write rows you own. Configure Supabase in your own cloud account for full control.",
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Human review by design",
    description:
      "Outputs are proposals — your team decides what ships. That posture carries through as we add automation.",
  },
];

const roadmapControls = [
  {
    title: "Parity & guardrails",
    description: "Automated comparison against live systems, rate limits, and policy checks before any agent acts.",
  },
  {
    title: "On-prem & BYO LLM",
    description: "Run extraction and storage entirely inside your perimeter with your approved models.",
  },
  {
    title: "Enterprise compliance pack",
    description: "Formal SOC 2 / ISO evidence, DPAs, and customer-managed keys — negotiated with serious deployments.",
  },
];

export default function Security() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section id="security" ref={ref} className="section-dark py-28 lg:py-36">
      <div className="container-apple">

        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 items-start mb-20">
          <motion.div
            initial={{ opacity: 1, y: 22 }}
            animate={{ opacity: 1, y: inView ? 0 : 22 }}
            transition={defaultTransition}
          >
            <p className="label-text text-[#6e6e73] mb-5">Security &amp; trust</p>
            <h2 className="section-headline text-white">
              No theatrics — just controls we can explain.
            </h2>
            <p className="mt-6 text-[16px] text-[#86868b] leading-relaxed max-w-[520px]">
              We don&apos;t claim certifications we haven&apos;t earned. Below is what the deployed app actually does; the roadmap lists what enterprise programs typically need next.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, y: 22 }}
            animate={{ opacity: 1, y: inView ? 0 : 22 }}
            transition={{ ...defaultTransition, delay: 0.12 }}
            className="lg:pt-4"
          >
            <div className="relative rounded-2xl border border-[#0071e3]/25 bg-gradient-to-br from-[#0071e3]/8 via-[#001d3d]/20 to-transparent backdrop-blur-sm p-8 overflow-hidden">
              <p className="text-[17px] font-semibold text-white tracking-[-0.022em] mb-3">
                Third-party subprocessors (today)
              </p>
              <ul className="text-[14px] text-[#86868b] leading-relaxed space-y-2 list-disc pl-5">
                <li>Clerk — authentication</li>
                <li>Supabase — Postgres hosting (your project)</li>
                <li>OpenAI — model inference for extraction</li>
              </ul>
              <p className="text-[12px] text-[#6e6e73] mt-4">
                Review your agreements with each vendor; we can support custom deployments as engagements mature.
              </p>
            </div>
          </motion.div>
        </div>

        <p className="text-[12px] font-semibold uppercase tracking-widest text-emerald-400/90 mb-4">Live controls</p>
        <div className="grid md:grid-cols-2 gap-5 mb-14">
          {liveControls.map((ctrl, i) => (
            <motion.div
              key={ctrl.title}
              initial={{ opacity: 1, y: 16 }}
              animate={{ opacity: 1, y: inView ? 0 : 16 }}
              transition={{ duration: 0.45, delay: 0.05 * i, ease: easeApple }}
              whileHover={{ y: -4 }}
              className="group relative bg-[#1d1d1f] rounded-[20px] p-8 border border-white/8 overflow-hidden transition-all duration-300 hover:border-white/16"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3]/3 via-transparent to-[#0071e3]/1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative mb-6 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0071e3]/10 group-hover:bg-[#0071e3]/20 text-[#0071e3] transition-colors duration-300">
                {ctrl.icon}
              </div>
              <div className="relative">
                <h3 className="text-[17px] font-semibold text-white tracking-[-0.022em] mb-3 leading-snug">
                  {ctrl.title}
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed tracking-[-0.01em]">
                  {ctrl.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-[12px] font-semibold uppercase tracking-widest text-[#6e6e73] mb-4">Roadmap (enterprise hardening)</p>
        <div className="grid md:grid-cols-3 gap-5">
          {roadmapControls.map((ctrl, i) => (
            <motion.div
              key={ctrl.title}
              initial={{ opacity: 1, y: 14 }}
              animate={{ opacity: 1, y: inView ? 0 : 14 }}
              transition={{ duration: 0.4, delay: 0.08 * i, ease: easeApple }}
              className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6"
            >
              <h3 className="text-[15px] font-semibold text-white tracking-[-0.02em] mb-2">
                {ctrl.title}
              </h3>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                {ctrl.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

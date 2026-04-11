"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FolderPlus, FileText, Sparkles, ListChecks, Share2 } from "lucide-react";
import {
  easeApple,
  inViewOpts,
  lineGrow,
  revealY,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

const steps = [
  {
    num: "01",
    title: "Project",
    description: "Name it. One trail.",
    icon: FolderPlus,
    detail: "Clerk + Supabase. Your tenant.",
  },
  {
    num: "02",
    title: "Paste",
    description: "Notes, tickets, threads — 100k chars max.",
    icon: FileText,
    detail: "No connector required for v1.",
  },
  {
    num: "03",
    title: "Extract",
    description: "OpenAI → summary, decisions, actions.",
    icon: Sparkles,
    detail: "Low temp. Errors surface.",
  },
  {
    num: "04",
    title: "Track",
    description: "Check actions off together.",
    icon: ListChecks,
    detail: "Same record for the team.",
  },
  {
    num: "05",
    title: "Iterate",
    description: "Re-run when context shifts.",
    icon: Share2,
    detail: "APIs / MCP: roadmap.",
  },
];

export default function Solution() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section id="solution" ref={ref} className="section-dark py-28 lg:py-36 relative overflow-hidden">
      <div className="container-apple">
        {/* Header */}
        <motion.div
          {...revealY(inView, 22)}
          className="max-w-[700px] mb-24"
        >
          <p className="label-text text-[#6e6e73] mb-5">How</p>
          <h2 className="section-headline text-white">
            Five moves. Repeat weekly.
          </h2>
          <p className="mt-5 text-[16px] text-[#86868b] max-w-[480px] tracking-[-0.01em]">
            Text in → structure out → track.
          </p>
        </motion.div>

        {/* Timeline Container */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative"
        >
          {/* Animated vertical line */}
          <div className="hidden lg:block absolute left-[39px] top-12 bottom-0 w-px">
            <motion.div
              variants={lineGrow}
              className="w-full h-full origin-top bg-gradient-to-b from-[#0071e3] via-[#0071e3]/50 to-transparent"
              style={{ transformOrigin: "top" }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-8 lg:space-y-12">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  variants={staggerItem}
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
          initial={{ opacity: 1, y: 18 }}
          animate={{ opacity: 1, y: inView ? 0 : 18 }}
          transition={{ duration: 0.55, delay: 0.65, ease: easeApple }}
          className="mt-16 lg:mt-24 p-8 lg:p-10 rounded-2xl border border-[#0071e3]/20 bg-gradient-to-r from-[#001d3d]/40 to-[#001d3d]/20 backdrop-blur-sm"
        >
          <p className="text-[17px] font-semibold text-white tracking-[-0.02em] mb-2">
            Zero prod access in this release.
          </p>
          <p className="text-[14px] text-[#86868b] tracking-[-0.01em]">
            Paste-only today. Connectors = roadmap. No mystery.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

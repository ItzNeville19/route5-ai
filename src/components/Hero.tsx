"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface StatValue {
  display: string;
  numeric?: number;
}

const stats = [
  { display: "< 1 week", numeric: undefined, label: "Time to first AI-callable capability" },
  { display: "95%+", numeric: 95, label: "Automated parity validation pass rate" },
  { display: "70%+", numeric: 70, label: "Reduction in manual operator steps" },
  { display: "Zero", numeric: 0, label: "Production code changes required" },
];

function CountUpStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const duration = 2000;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target]);

  return (
    <div className="text-[32px] font-bold text-white tracking-[-0.025em] leading-none mb-2">
      {count}{suffix}
    </div>
  );
}

export default function Hero() {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  const flowItem = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8 },
    },
  };

  return (
    <section className="section-dark relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Animated gradient orb background */}
      <motion.div
        className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(0,113,227,0.15) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -30, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
        }}
      />

      <motion.div
        className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(0,113,227,0.08) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, -40, 40, 0],
          y: [0, 40, -40, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
        }}
      />

      {/* Floating particles background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() > 0.5 ? 20 : -20, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              ease: [0.42, 0, 0.58, 1],
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Subtle radial gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(0,113,227,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="container-apple relative z-10 pt-28 pb-24">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="space-y-0"
        >
          {/* Eyebrow */}
          <motion.p
            variants={item}
            className="label-text text-[#6e6e73] mb-7 uppercase text-[12px] tracking-widest font-medium"
          >
            Enterprise AI Infrastructure
          </motion.p>

          {/* Headline with gradient on key words */}
          <motion.h1
            variants={item}
            className="display-headline text-white max-w-[900px] relative"
          >
            <span className="relative inline-block">
              The
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-0 blur-sm rounded-lg"
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </span>
            {" "}
            <motion.span
              className="relative inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-500"
              animate={{
                backgroundPosition: ["0%", "100%"],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              AI Execution Layer
            </motion.span>
            {" "}
            <br />
            for Enterprise Systems.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={item}
            className="mt-8 text-[21px] text-[#86868b] max-w-[580px] leading-snug tracking-[-0.022em] font-light"
          >
            Connect AI agents to legacy Java and .NET systems — without
            touching a single line of production code.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={item}
            className="mt-12 flex flex-wrap items-center gap-5"
          >
            <motion.a
              href="#contact"
              className="btn-primary text-[15px] font-medium tracking-[-0.01em] relative group overflow-hidden"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 group-hover:opacity-100"
                transition={{ duration: 0.3 }}
              />
              <span className="relative">Request a Briefing</span>
            </motion.a>
            <motion.a
              href="#solution"
              className="btn-text text-[15px] font-medium tracking-[-0.01em] gap-2 group"
              whileHover={{ x: 4 }}
            >
              See how it works
              <motion.svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="group-hover:translate-x-1 transition-transform"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.a>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={item}
            className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-px bg-gradient-to-br from-blue-500/20 to-transparent border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm"
          >
            {stats.map((s, idx) => (
              <motion.div
                key={s.label}
                className="bg-black/40 backdrop-blur px-7 py-8 hover:bg-black/60 transition-colors duration-300"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + idx * 0.1, duration: 0.6 }}
              >
                {s.numeric !== undefined ? (
                  <CountUpStat target={s.numeric} suffix={s.display.slice(-1)} label={s.label} />
                ) : (
                  <div className="text-[32px] font-bold text-white tracking-[-0.025em] leading-none mb-2">
                    {s.display}
                  </div>
                )}
                <div className="text-[13px] text-[#6e6e73] leading-snug tracking-[-0.01em]">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Flow diagram */}
          <motion.div
            variants={item}
            className="mt-24 max-w-[950px]"
          >
            <motion.p
              className="label-text text-[#6e6e73] mb-8 uppercase text-[12px] tracking-widest font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              How Route5 Works
            </motion.p>

            <div className="flex flex-col lg:flex-row items-stretch rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
              {/* Legacy System */}
              <motion.div
                className="flex-1 bg-gradient-to-br from-[#1d1d1f] to-black/50 p-8 relative overflow-hidden group"
                variants={flowItem}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center mb-5 group-hover:bg-white/12 transition-colors"
                    whileHover={{ rotate: 5, scale: 1.05 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="2" y="4" width="16" height="12" rx="2" stroke="#6e6e73" strokeWidth="1.5" />
                      <path d="M6 8l2.5 2.5L6 13" stroke="#6e6e73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 13h4" stroke="#6e6e73" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                  <p className="text-[15px] font-semibold text-white tracking-[-0.02em] mb-2">Legacy System</p>
                  <p className="text-[13px] text-[#6e6e73] leading-relaxed">Java · .NET · COBOL<br />No APIs. No modern interfaces.</p>
                </div>
              </motion.div>

              {/* Arrow 1 */}
              <motion.div
                className="flex items-center justify-center bg-black/40 backdrop-blur px-5 py-4 lg:py-0 relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.6 }}
              >
                <motion.svg
                  className="hidden lg:block rotate-0"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <path
                    d="M5 12h14M15 8l4 4-4 4"
                    stroke="#0071e3"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
                <motion.svg
                  className="lg:hidden"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <path
                    d="M12 5v14M8 15l4 4 4-4"
                    stroke="#0071e3"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </motion.div>

              {/* Route5 Platform */}
              <motion.div
                className="flex-1 bg-gradient-to-br from-[#001d3d]/60 to-black/50 border-x border-white/10 p-8 relative overflow-hidden group"
                variants={flowItem}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-[#0071e3]/20 flex items-center justify-center mb-5 group-hover:bg-[#0071e3]/30 transition-colors"
                    whileHover={{ rotate: -5, scale: 1.05 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#0071e3" />
                      <rect x="11" y="2" width="7" height="7" rx="1.5" fill="rgba(0,113,227,0.5)" />
                      <rect x="2" y="11" width="7" height="7" rx="1.5" fill="rgba(0,113,227,0.5)" />
                      <rect x="11" y="11" width="7" height="7" rx="1.5" fill="rgba(0,113,227,0.25)" />
                    </svg>
                  </motion.div>
                  <p className="text-[15px] font-semibold text-white tracking-[-0.02em] mb-2">Route5 Platform</p>
                  <p className="text-[13px] text-[#86868b] leading-relaxed">Multi-signal extraction · AI analysis<br />Parity validation · Human approval</p>
                </div>
              </motion.div>

              {/* Arrow 2 */}
              <motion.div
                className="flex items-center justify-center bg-black/40 backdrop-blur px-5 py-4 lg:py-0 relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.15, duration: 0.6 }}
              >
                <motion.svg
                  className="hidden lg:block"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                >
                  <path
                    d="M5 12h14M15 8l4 4-4 4"
                    stroke="#0071e3"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
                <motion.svg
                  className="lg:hidden"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                >
                  <path
                    d="M12 5v14M8 15l4 4 4-4"
                    stroke="#0071e3"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </motion.div>

              {/* AI Agent */}
              <motion.div
                className="flex-1 bg-gradient-to-br from-[#1d1d1f] to-black/50 p-8 relative overflow-hidden group"
                variants={flowItem}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center mb-5 group-hover:bg-white/12 transition-colors"
                    whileHover={{ rotate: 5, scale: 1.05 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="7" r="3.5" stroke="#6e6e73" strokeWidth="1.5" />
                      <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#6e6e73" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                  <p className="text-[15px] font-semibold text-white tracking-[-0.02em] mb-2">AI Agent</p>
                  <p className="text-[13px] text-[#6e6e73] leading-relaxed">MCP Tools · REST APIs · SDKs<br />Safe · Validated · Deterministic</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade gradient */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/50 to-transparent" />
    </section>
  );
}

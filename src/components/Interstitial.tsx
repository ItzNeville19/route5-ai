"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

// Simple count-up animation
function Counter({ target, duration = 2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      setCount(Math.floor(target * progress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  return <span>{count}</span>;
}

export default function Interstitial() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [animateCounters, setAnimateCounters] = useState(false);

  useEffect(() => {
    if (inView) setAnimateCounters(true);
  }, [inView]);

  const stats = [
    { value: "$3T+", label: "Locked in legacy systems" },
    { value: "85%", label: "AI initiatives blocked by legacy access" },
    { value: "3–5 yr", label: "Traditional modernization timeline" },
  ];

  return (
    <section
      ref={ref}
      className="section-gradient-dark py-28 lg:py-36 border-t border-b border-white/8"
    >
      <div className="container-apple">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="label-text text-[#86868b] mb-6"
        >
          The Opportunity
        </motion.p>

        {/* Main headline with gradient */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="max-w-[920px] mb-16 lg:mb-20"
        >
          <h2 className="section-headline text-white mb-6">
            Your AI investment is ready to execute.
          </h2>
          <p className="text-[16px] lg:text-[18px] text-[#86868b] leading-relaxed tracking-[-0.01em] max-w-[700px]">
            Legacy systems are the last barrier standing between your AI investment and the operational ROI your board expects.
          </p>
        </motion.div>

        {/* Stats grid with count-up animations */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-8 lg:gap-12 border-t border-white/10 pt-12 lg:pt-16"
        >
          {stats.map((item, idx) => (
            <motion.div
              key={item.value}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
              className="flex flex-col gap-3"
            >
              <div className="text-[32px] lg:text-[40px] font-bold text-white tracking-[-0.025em] leading-none">
                {item.value.endsWith("+") || item.value.endsWith("%") || item.value.includes("–")
                  ? item.value
                  : animateCounters
                    ? item.value
                    : "0"}
              </div>
              <p className="text-[14px] text-[#86868b] leading-relaxed max-w-[180px]">
                {item.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { MarketStat } from "@/lib/market-stats";
import { inViewOpts } from "@/lib/motion";

function formatAnimated(
  n: number,
  decimals: number,
  prefix: string,
  suffix: string
) {
  const fixed = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
  return `${prefix}${fixed}${suffix}`;
}

export default function AnimatedMetric({ stat }: { stat: MarketStat }) {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);
  const [shown, setShown] = useState(0);
  const target = stat.value ?? 0;
  const decimals = stat.decimals ?? 0;
  const prefix = stat.prefix ?? "";
  const suffix = stat.suffix ?? "";

  useEffect(() => {
    if (stat.display != null) return;
    if (!inView) return;

    const duration = 2200;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, stat.display, target]);

  const displayText =
    stat.display != null
      ? stat.display
      : formatAnimated(shown, decimals, prefix, suffix);

  return (
    <motion.div
      ref={ref}
      className="flex flex-col gap-3"
      initial={{ opacity: 1, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-[32px] lg:text-[44px] font-bold text-white tracking-[-0.035em] leading-none tabular-nums">
        {displayText}
      </div>
      <p className="text-[14px] text-[#a1a1a6] leading-relaxed max-w-[220px]">
        {stat.label}
      </p>
      <a
        href={stat.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] font-medium text-[#0071e3] hover:text-[#4da3ff] transition-colors inline-flex items-center gap-1 w-fit group"
      >
        <span className="border-b border-[#0071e3]/40 group-hover:border-[#4da3ff]">
          {stat.sourceLabel}
        </span>
        <span aria-hidden className="translate-x-0 group-hover:translate-x-0.5 transition-transform">
          ↗
        </span>
      </a>
    </motion.div>
  );
}

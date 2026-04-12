"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PRODUCT_LIVE, PRODUCT_ROADMAP } from "@/lib/product-truth";
import { easeApple, staggerContainer, staggerItemTight } from "@/lib/motion";

const liveItems = [
  { title: "Auth & workspace", body: PRODUCT_LIVE.auth },
  {
    title: "Projects & extraction",
    body: `${PRODUCT_LIVE.projects} ${PRODUCT_LIVE.extract}`,
  },
  {
    title: "Linear & GitHub",
    body: `${PRODUCT_LIVE.linear} ${PRODUCT_LIVE.github}`,
  },
  { title: "Data & limits", body: `${PRODUCT_LIVE.data} ${PRODUCT_LIVE.limits}` },
];

type ProductStripProps = {
  /** Dark command canvas — matches workspace marketing home. */
  tone?: "light" | "command";
};

export default function ProductStrip({ tone = "light" }: ProductStripProps) {
  const reduceMotion = useReducedMotion();
  const command = tone === "command";
  const kicker = command ? "text-zinc-400" : "text-[#1d1d1f]/45";
  const h2 = command ? "text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]" : "text-[#1d1d1f]";
  const body = command ? "text-zinc-300" : "text-[#1d1d1f]/58";
  const cardTitle = command ? "text-white" : "text-[#1d1d1f]";
  const cardBody = command ? "text-zinc-200/95" : "text-[#6e6e73]";
  const roadmapKicker = command ? "text-zinc-400" : "text-[#86868b]";
  const roadmapText = command ? "text-zinc-200/95" : "text-[#6e6e73]";
  const dash = command ? "text-zinc-400" : "text-[#86868b]";
  const linkClass = command
    ? "font-medium text-sky-400 underline-offset-4 transition hover:text-sky-300 hover:underline"
    : "font-medium text-[#0071e3] underline-offset-4 transition hover:text-[#0077ed] hover:underline";

  return (
    <section
      id="product"
      className={
        command
          ? "scroll-mt-28 border-t border-white/10 px-5 py-16 sm:px-8 lg:px-12"
          : "scroll-mt-28 border-t border-black/[0.06] px-5 py-16 sm:px-8 lg:px-12"
      }
    >
      <div className="mx-auto max-w-[1100px]">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: easeApple }}
          className={`text-center text-[11px] font-semibold uppercase tracking-[0.2em] ${kicker}`}
        >
          Shipping now
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: easeApple, delay: 0.05 }}
          className={`mt-3 text-center text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-[-0.03em] ${h2}`}
        >
          What Route5 does today
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: easeApple, delay: 0.1 }}
          className={`mx-auto mt-3 max-w-2xl text-center text-[15px] leading-relaxed ${body}`}
        >
          {PRODUCT_LIVE.actions} Roadmap items are labeled — we don&apos;t blur the line
          between shipped and planned.
        </motion.p>

        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ perspective: 1200 }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {liveItems.map((item) => (
            <motion.div
              key={item.title}
              variants={staggerItemTight}
              whileHover={
                reduceMotion
                  ? undefined
                  : { y: -5, scale: 1.015, rotateX: 2, rotateY: -2 }
              }
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              style={{ transformStyle: "preserve-3d" }}
              className="glass-liquid glass-liquid-interactive liquid-glass-shimmer route5-tilt-hover rounded-2xl p-6"
            >
              <h3 className={`text-[15px] font-semibold ${cardTitle}`}>{item.title}</h3>
              <p className={`mt-2 text-[14px] leading-relaxed ${cardBody}`}>{item.body}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: easeApple, delay: 0.12 }}
          className={
            command
              ? "glass-liquid liquid-glass-shimmer mt-10 rounded-2xl border border-dashed border-white/15 px-6 py-8"
              : "glass-liquid liquid-glass-shimmer mt-10 rounded-2xl border border-dashed border-black/[0.08] px-6 py-8"
          }
        >
          <p className={`text-[12px] font-semibold uppercase tracking-[0.14em] ${roadmapKicker}`}>
            On the roadmap
          </p>
          <ul className={`mt-4 space-y-2 text-[14px] ${roadmapText}`}>
            {PRODUCT_ROADMAP.map((line) => (
              <li key={line} className="flex gap-2">
                <span className={dash} aria-hidden>
                  —
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-[14px]">
            <Link href="/contact" className={linkClass}>
              Talk to us about fit and timeline
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

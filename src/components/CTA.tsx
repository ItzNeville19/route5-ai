"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { easeApple, inViewOpts } from "@/lib/motion";
import { CONTACT_EMAIL, mailtoHref } from "@/lib/site";

export default function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  return (
    <section
      id="cta"
      ref={ref}
      className="section-dark py-28 lg:py-36 border-t border-white/10 relative overflow-hidden"
    >
      {/* Gradient background with glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0071e3]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-apple relative z-10">
        <div className="grid lg:grid-cols-[1.3fr_auto] gap-16 lg:gap-20 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 1, y: 24 }}
            animate={{ opacity: 1, y: inView ? 0 : 24 }}
            transition={{ duration: 0.6, ease: easeApple }}
          >
            <h2
              className="text-white font-bold tracking-[-0.035em] leading-[1.02] mb-5"
              style={{ fontSize: "clamp(36px, 4.5vw, 52px)" }}
            >
              Ready when you are.
            </h2>
            <p className="text-[17px] text-[#a1a1a6] max-w-[440px] tracking-[-0.015em]">
              15 minutes. Live product. Direct line.
            </p>
          </motion.div>

          {/* Right: CTAs */}
          <motion.div
            initial={{ opacity: 1, y: 18 }}
            animate={{ opacity: 1, y: inView ? 0 : 18 }}
            transition={{ duration: 0.6, delay: 0.15, ease: easeApple }}
            className="flex flex-col gap-3 lg:items-end"
          >
            <Link
              href="/#contact"
              className="btn-primary btn-shine relative overflow-hidden whitespace-nowrap px-8 py-3.5 text-[17px] font-semibold"
            >
              Book
            </Link>
            <a
              href={mailtoHref("Route5 — Briefing")}
              className="btn-shine relative overflow-hidden whitespace-nowrap rounded-xl border border-white/20 px-8 py-3.5 text-center text-[17px] font-medium tracking-[-0.022em] text-white transition-colors duration-200 hover:border-white/40 hover:bg-white/5"
            >
              {CONTACT_EMAIL}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

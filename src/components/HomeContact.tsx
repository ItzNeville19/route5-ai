"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { easeApple } from "@/lib/motion";

type HomeContactProps = {
  tone?: "light" | "command";
};

export default function HomeContact({ tone = "light" }: HomeContactProps) {
  const command = tone === "command";
  const h2 = command ? "text-white" : "text-[#1d1d1f]";
  const body = command ? "text-zinc-200/95" : "text-[#6e6e73]";
  const foot = command ? "text-zinc-400" : "text-[#86868b]";
  const link = command ? "text-sky-400 hover:underline" : "text-[#0071e3] hover:underline";

  return (
    <section
      id="contact"
      className={
        command
          ? "scroll-mt-28 border-t border-white/10 px-5 py-20 sm:px-8 lg:px-12"
          : "scroll-mt-28 border-t border-black/[0.06] px-5 py-20 sm:px-8 lg:px-12"
      }
    >
      <div className="mx-auto max-w-[720px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: easeApple }}
          className="glass-liquid glass-liquid-interactive liquid-glass-shimmer route5-tilt-hover rounded-3xl px-8 py-12 sm:px-12 sm:py-14"
        >
          <h2 className={`text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] ${h2}`}>
            Brief us on your stack and priorities
          </h2>
          <p className={`mx-auto mt-3 max-w-md text-[15px] leading-relaxed ${body}`}>
            CEOs and platform leads: we respond with a concrete next step — intro call,
            workspace walkthrough, or written follow-up when it makes sense.
          </p>
          <motion.div
            className="mt-8 inline-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <Link
              href="/contact"
              className="btn-primary inline-flex items-center justify-center rounded-full px-8 py-3 text-[15px] font-semibold"
            >
              Open contact form
            </Link>
          </motion.div>
          <p className={`mt-6 text-[13px] ${foot}`}>
            Prefer email? Use the address on the{" "}
            <Link href="/contact" className={link}>
              contact page
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Inbox, ListChecks, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { easeApple, staggerContainer, staggerItemTight } from "@/lib/motion";
import { PRODUCT_VS_EPHEMERAL_CHAT } from "@/lib/product-truth";

/**
 * Marketing-only explainer: what Route5 is in very simple terms,
 * visually distinct from the dense showcase grid below.
 */
export default function HomeSimpleExplain() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const steps = [
    {
      icon: <Inbox className="h-7 w-7" strokeWidth={1.6} aria-hidden />,
      title: t("marketing.simple.step1Title"),
      body: t("marketing.simple.step1Body"),
      accent: "from-sky-500/25 via-violet-500/15 to-fuchsia-500/10",
    },
    {
      icon: <Sparkles className="h-7 w-7" strokeWidth={1.6} aria-hidden />,
      title: t("marketing.simple.step2Title"),
      body: t("marketing.simple.step2Body"),
      accent: "from-violet-500/25 via-fuchsia-500/12 to-amber-500/8",
    },
    {
      icon: <ListChecks className="h-7 w-7" strokeWidth={1.6} aria-hidden />,
      title: t("marketing.simple.step3Title"),
      body: t("marketing.simple.step3Body"),
      accent: "from-emerald-500/20 via-teal-500/12 to-sky-500/10",
    },
  ] as const;

  return (
    <section
      id="story"
      className="scroll-mt-24 border-t border-white/[0.08] bg-gradient-to-b from-transparent via-violet-950/20 to-transparent px-5 py-16 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-[1040px]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: easeApple }}
          className="text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            {t("marketing.simple.kicker")}
          </p>
          <h2 className="mt-3 bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-[clamp(1.65rem,4vw,2.35rem)] font-semibold tracking-[-0.04em] text-transparent [text-shadow:0_2px_40px_rgba(139,92,246,0.25)]">
            {t("marketing.simple.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-[52rem] text-[16px] leading-[1.65] text-zinc-300 sm:text-[17px]">
            {t("marketing.simple.lead")}
          </p>
        </motion.div>

        <motion.ul
          className="mt-12 grid gap-5 sm:grid-cols-3"
          style={{ perspective: 1000 }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              variants={staggerItemTight}
              whileHover={
                reduceMotion
                  ? undefined
                  : { y: -5, transition: { type: "spring", stiffness: 400, damping: 28 } }
              }
              className="relative list-none"
            >
              <div
                className={`relative flex h-full flex-col overflow-hidden rounded-[26px] border border-white/[0.1] bg-gradient-to-br ${step.accent} p-[1px] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)]`}
              >
                <div className="flex h-full flex-col rounded-[25px] border border-white/[0.06] bg-zinc-950/75 p-6 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-violet-200"
                      aria-hidden
                    >
                      {step.icon}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-zinc-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[14px] leading-relaxed text-zinc-400">
                    {step.body}
                  </p>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: easeApple }}
          className="mx-auto mt-14 max-w-[920px]"
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {t("marketing.simple.vsChat.kicker")}
          </p>
          <h3 className="mt-3 text-center text-[clamp(1.25rem,3vw,1.6rem)] font-semibold tracking-[-0.03em] text-white">
            {PRODUCT_VS_EPHEMERAL_CHAT.sectionTitle}
          </h3>
          <p className="mx-auto mt-4 max-w-[52rem] text-center text-[15px] leading-relaxed text-zinc-400 sm:text-[16px]">
            {PRODUCT_VS_EPHEMERAL_CHAT.intro}
          </p>
          <div className="mt-8 overflow-x-auto rounded-[22px] border border-white/[0.1] bg-zinc-950/60">
            <table className="w-full min-w-[560px] text-left text-[13px] leading-snug sm:text-[14px] sm:leading-relaxed">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  <th className="px-4 py-3 font-medium sm:px-5">{t("marketing.simple.vsChat.colArea")}</th>
                  <th className="px-4 py-3 font-medium sm:px-5">{t("marketing.simple.vsChat.colChat")}</th>
                  <th className="px-4 py-3 font-medium sm:px-5">{t("marketing.simple.vsChat.colRoute5")}</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {PRODUCT_VS_EPHEMERAL_CHAT.rows.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-4 py-3.5 font-semibold text-white sm:px-5 sm:py-4">{row.label}</td>
                    <td className="px-4 py-3.5 text-zinc-500 sm:px-5 sm:py-4">{row.chat}</td>
                    <td className="px-4 py-3.5 text-zinc-200 sm:px-5 sm:py-4">{row.route5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 text-center text-[13px] text-zinc-500">
            <Link
              href="/product#chat-vs-workspace"
              className="font-medium text-sky-300 transition hover:text-white hover:underline"
            >
              {t("marketing.simple.vsChat.linkProduct")}
            </Link>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12, duration: 0.5 }}
          className="mx-auto mt-12 max-w-[44rem] rounded-2xl border border-emerald-500/20 bg-emerald-950/25 px-5 py-4 text-center text-[13px] leading-relaxed text-emerald-100/95 sm:px-6"
        >
          <p>{t("marketing.simple.trustNote")}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-medium">
            <Link
              href="/product"
              className="inline-flex items-center gap-1 text-sky-300 transition hover:text-white hover:underline"
            >
              {t("marketing.simple.linkProduct")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <span className="hidden text-zinc-600 sm:inline" aria-hidden>
              ·
            </span>
            <Link
              href="/product#roadmap"
              className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-zinc-200 hover:underline"
            >
              {t("marketing.simple.linkBoundaries")}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

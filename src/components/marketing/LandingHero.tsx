"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useClerkRuntimeEnabled } from "@/components/providers/ClerkRuntimeProvider";

const LandingHeroClerkCtasLazy = dynamic(
  () => import("@/components/LandingHeroClerkCtas").then((m) => m.LandingHeroClerkCtas),
  { ssr: false, loading: () => null }
);
import { easeApple } from "@/lib/motion";

const ease = [0.22, 1, 0.36, 1] as const;

export default function LandingHero() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const clerkRuntimeOk = useClerkRuntimeEnabled();

  return (
    <section className="relative flex min-h-[min(88dvh,820px)] flex-col justify-center overflow-hidden pt-20">
      {/* Animated aurora layer */}
      <div
        className="landing-aurora-blob pointer-events-none absolute -left-[20%] top-[8%] h-[min(520px,70vw)] w-[min(520px,70vw)] rounded-full bg-gradient-to-br from-cyan-500/25 via-violet-600/20 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="landing-aurora-blob pointer-events-none absolute -right-[15%] bottom-[5%] h-[min(440px,58vw)] w-[min(440px,58vw)] rounded-full bg-gradient-to-tl from-fuchsia-500/18 via-indigo-500/15 to-transparent blur-3xl [animation-delay:-4s]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[320px] w-[min(90%,720px)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent_65%)]"
        aria-hidden
      />

      <div className="container-apple relative z-10 pb-12 pt-24 md:pb-20 md:pt-28">
        <motion.div
          initial={{ opacity: 1, y: reduceMotion ? 0 : 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: easeApple }}
          className="mx-auto max-w-[980px] text-center"
        >
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5, ease }}
            className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500"
          >
            {t("marketing.landing.hero.kicker")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease }}
            className="font-semibold tracking-[-0.055em] text-white [text-shadow:0_4px_60px_rgba(0,0,0,0.55)]"
            style={{
              fontSize: "clamp(2.5rem, 7vw, 4.15rem)",
              fontWeight: 600,
              lineHeight: 1.05,
            }}
          >
            {t("marketing.landing.hero.headline")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.55, ease }}
            className="mx-auto mt-6 max-w-[34rem] text-[17px] font-light leading-[1.55] tracking-[-0.02em] text-zinc-400 sm:text-[18px]"
          >
            {t("marketing.landing.hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5, ease }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[14px] font-semibold tracking-[-0.02em] text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_50px_-18px_rgba(255,255,255,0.35)] transition hover:bg-zinc-100 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_24px_60px_-16px_rgba(139,92,246,0.45)]"
            >
              <Play className="h-4 w-4 opacity-80" aria-hidden />
              {t("marketing.landing.hero.ctaDemo")}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a
              href="#story"
              className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-6 py-3.5 text-[14px] font-medium tracking-[-0.02em] text-zinc-200 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10"
            >
              {t("marketing.landing.hero.ctaScrollFeatures")}
            </a>
            <Link
              href="/product"
              className="inline-flex items-center rounded-full px-5 py-3.5 text-[14px] font-medium tracking-[-0.02em] text-zinc-500 transition hover:text-white"
            >
              {t("marketing.landing.hero.ctaProduct")}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.45 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            {clerkRuntimeOk ? (
              <LandingHeroClerkCtasLazy />
            ) : (
              <Link
                href="/login"
                className="inline-flex rounded-full border border-white/12 px-5 py-2.5 text-[13px] font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.06]"
              >
                {t("marketing.hero.logIn")}
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

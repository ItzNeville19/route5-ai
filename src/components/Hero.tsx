"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useClerkRuntimeEnabled } from "@/components/providers/ClerkRuntimeProvider";

const HeroClerkCardActionsLazy = dynamic(
  () => import("./HeroClerkCardActions").then((m) => m.HeroClerkCardActions),
  { ssr: false, loading: () => null }
);
import { useI18n } from "@/components/i18n/I18nProvider";
import { BrandSquircle, type BrandIconId } from "@/components/marketplace/brand-icons";

const ease = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 1, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease },
  },
};

const cardSpring = { type: "spring" as const, stiffness: 280, damping: 26 };

const HERO_INPUT_ICONS: { id: BrandIconId; labelKey: string }[] = [
  { id: "voice", labelKey: "marketing.hero.previewMeetings" },
  { id: "slack", labelKey: "marketing.hero.previewSlack" },
  { id: "generic", labelKey: "marketing.hero.previewEmail" },
  { id: "google", labelKey: "marketing.hero.previewCalendar" },
];

const HERO_OUTPUT_ICONS: { id: BrandIconId; labelKey: string }[] = [
  { id: "workspaceHome", labelKey: "marketing.hero.previewDesk" },
  { id: "workspaceSparkle", labelKey: "marketing.hero.previewOverview" },
  { id: "linear", labelKey: "marketing.hero.previewLinear" },
];

type HeroProps = {
  /** Match signed-in workspace/dashboard dark command canvas (marketing home). */
  commandTheme?: boolean;
};

export default function Hero({ commandTheme = false }: HeroProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const clerkRuntimeOk = useClerkRuntimeEnabled();
  const kicker = commandTheme
    ? "text-zinc-400 [text-shadow:0_1px_18px_rgba(139,92,246,0.35)]"
    : "text-[#1d1d1f]/45";
  const title = commandTheme
    ? "text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.45),0_0_48px_rgba(139,92,246,0.18)]"
    : "text-[#1d1d1f]";
  const bodyMuted = commandTheme ? "text-zinc-300" : "text-[#1d1d1f]/58";
  const mono = commandTheme
    ? "font-medium tracking-wide text-emerald-200/95"
    : "text-[#86868b]";
  const small = commandTheme ? "text-zinc-300" : "text-[#6e6e73]";
  const emphasis = commandTheme ? "text-white" : "text-[#1d1d1f]";
  const cardInner = commandTheme
    ? "workspace-liquid-glass liquid-glass-shimmer rounded-[1.28rem] px-6 py-5"
    : "rounded-[1.28rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.55)_0%,rgba(250,245,255,0.5)_100%)] px-5 py-4 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] backdrop-blur-md";
  const secondaryBtn = commandTheme
    ? "inline-flex rounded-full border border-white/22 bg-white/[0.08] px-5 py-2.5 text-[13px] font-medium text-zinc-50 shadow-sm transition hover:border-white/30 hover:bg-white/[0.14]"
    : "inline-flex rounded-full border border-black/[0.1] bg-white/80 px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-white";

  return (
    <section className="relative flex min-h-[min(82dvh,760px)] flex-col justify-center overflow-hidden pt-20">
      <div
        className={
          commandTheme
            ? "liquid-blob pointer-events-none absolute -left-24 top-1/4 h-[min(420px,55vw)] w-[min(420px,55vw)] rounded-full bg-gradient-to-br from-indigo-500/20 via-violet-500/12 to-transparent"
            : "liquid-blob pointer-events-none absolute -left-24 top-1/4 h-[min(420px,55vw)] w-[min(420px,55vw)] rounded-full bg-gradient-to-br from-[#c4b5fd]/35 via-[#a78bfa]/25 to-transparent"
        }
        aria-hidden
      />
      <div
        className={
          commandTheme
            ? "liquid-blob liquid-blob-delayed pointer-events-none absolute -right-20 bottom-[18%] h-[min(360px,48vw)] w-[min(360px,48vw)] rounded-full bg-gradient-to-tl from-fuchsia-500/15 via-violet-500/10 to-transparent"
            : "liquid-blob liquid-blob-delayed pointer-events-none absolute -right-20 bottom-[18%] h-[min(360px,48vw)] w-[min(360px,48vw)] rounded-full bg-gradient-to-tl from-[#f9a8d4]/22 via-[#a78bfa]/18 to-transparent"
        }
        aria-hidden
      />
      <div className="container-apple relative z-10 pb-16 pt-28 md:pb-24 md:pt-32">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-[920px] text-center"
        >
          <motion.p
            variants={item}
            className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] ${kicker}`}
          >
            {t("marketing.hero.kicker")}
          </motion.p>

          <motion.h1
            variants={item}
            className={`font-semibold tracking-[-0.045em] ${title}`}
            style={{ fontSize: "clamp(2.25rem, 6.5vw, 3.5rem)" }}
          >
            {t("marketing.hero.headline")}
          </motion.h1>

          <motion.p
            variants={item}
            className={`mx-auto mt-5 max-w-lg text-[clamp(16px,1.8vw,18px)] leading-relaxed ${bodyMuted}`}
          >
            {t("marketing.hero.subtitle")}
          </motion.p>

          {/* Command-style primary surface (workspace IDE family) */}
          <motion.div
            variants={item}
            className="route5-perspective-shell mx-auto mt-10 max-w-xl"
            whileHover={
              reduceMotion ? undefined : { y: -6, rotateX: 2.5, rotateY: -2.5 }
            }
            transition={cardSpring}
          >
                <div className="glass-liquid glass-liquid-interactive liquid-glass-shimmer rounded-[1.35rem] p-[1px] text-left">
              <div className={cardInner}>
                <p className={`font-mono text-[12px] sm:text-[13px] ${mono}`}>
                  {t("marketing.hero.mono")}
                </p>
                <p className={`mt-2 text-[13px] leading-relaxed sm:text-[14px] ${small}`}>
                  {t("marketing.hero.cardBody")}
                </p>
                {clerkRuntimeOk ? (
                  <HeroClerkCardActionsLazy emphasis={emphasis} small={small} secondaryBtn={secondaryBtn} />
                ) : (
                  <>
                    <p className={`mt-2 text-[15px] font-medium ${emphasis}`}>
                      {t("marketing.hero.noClerkTitle")}
                    </p>
                    <p className={`mt-1 text-[13px] leading-snug ${small}`}>
                      {t("marketing.hero.noClerkBody")}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href="/login"
                        className="inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
                      >
                        {t("marketing.hero.logIn")}
                      </Link>
                      <Link
                        href="/contact"
                        className={secondaryBtn}
                      >
                        {t("marketing.hero.contact")}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {commandTheme ? (
            <motion.div variants={item} className="mx-auto mt-12 w-full max-w-[720px] px-2">
              <p
                className={`text-center text-[11px] font-semibold uppercase tracking-[0.22em] ${kicker}`}
              >
                {t("marketing.hero.previewKicker")}
              </p>
              <div
                className="mt-6 flex flex-wrap items-end justify-center gap-x-1 gap-y-4 sm:gap-x-2"
                aria-label={t("marketing.hero.previewAria")}
              >
                <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
                  {HERO_INPUT_ICONS.map((row) => (
                    <div
                      key={row.labelKey}
                      className="flex w-[68px] flex-col items-center gap-1.5 sm:w-[76px]"
                    >
                      <BrandSquircle id={row.id} sizeClass="h-11 w-11 sm:h-12 sm:w-12" />
                      <span className={`text-center text-[10px] font-medium leading-tight ${small}`}>
                        {t(row.labelKey)}
                      </span>
                    </div>
                  ))}
                </div>
                <span
                  className={`mb-8 hidden px-1 text-[18px] font-light sm:inline ${bodyMuted}`}
                  aria-hidden
                >
                  →
                </span>
                <div className="flex flex-col items-center gap-1.5 px-2 sm:px-3">
                  <BrandSquircle id="route5" sizeClass="h-14 w-14 sm:h-16 sm:w-16" />
                  <span className={`text-center text-[11px] font-semibold leading-tight ${emphasis}`}>
                    Route5
                  </span>
                </div>
                <span
                  className={`mb-8 hidden px-1 text-[18px] font-light sm:inline ${bodyMuted}`}
                  aria-hidden
                >
                  →
                </span>
                <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
                  {HERO_OUTPUT_ICONS.map((row) => (
                    <div
                      key={row.labelKey}
                      className="flex w-[68px] flex-col items-center gap-1.5 sm:w-[76px]"
                    >
                      <BrandSquircle id={row.id} sizeClass="h-11 w-11 sm:h-12 sm:w-12" />
                      <span className={`text-center text-[10px] font-medium leading-tight ${small}`}>
                        {t(row.labelKey)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/contact"
              className={
                commandTheme
                  ? "inline-flex items-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-[14px] font-semibold tracking-[-0.02em] text-zinc-100 shadow-sm backdrop-blur-md transition hover:bg-white/10"
                  : "inline-flex items-center rounded-full border border-black/[0.1] bg-white/70 px-7 py-3 text-[14px] font-semibold tracking-[-0.02em] text-[#1d1d1f] shadow-sm backdrop-blur-md transition hover:bg-white"
              }
            >
              {t("marketing.hero.getInTouch")}
            </Link>
            <Link
              href="/pricing"
              className={
                commandTheme
                  ? "inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-[14px] font-medium tracking-[-0.02em] text-zinc-200 shadow-sm backdrop-blur-md transition hover:bg-white/10"
                  : "inline-flex items-center rounded-full border border-black/[0.08] bg-white/55 px-5 py-3 text-[14px] font-medium tracking-[-0.02em] text-[#1d1d1f] shadow-sm backdrop-blur-md transition hover:bg-white/90"
              }
            >
              {t("marketing.hero.plans")}
            </Link>
            <Link
              href="/product"
              className={
                commandTheme
                  ? "inline-flex items-center rounded-full px-5 py-3 text-[14px] font-medium tracking-[-0.02em] text-sky-400 transition hover:underline"
                  : "inline-flex items-center rounded-full px-5 py-3 text-[14px] font-medium tracking-[-0.02em] text-[#0071e3] transition hover:underline"
              }
            >
              {t("marketing.hero.whatWeShip")}
            </Link>
          </motion.div>

          {commandTheme ? (
            <motion.div
              variants={item}
              className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            >
              <Link
                href="#story"
                className="text-[13px] font-medium text-sky-300/95 transition hover:text-white hover:underline"
              >
                {t("marketing.simple.anchor")} →
              </Link>
              <span className="hidden text-zinc-600 sm:inline" aria-hidden>
                ·
              </span>
              <Link
                href="#showcase"
                className="text-[13px] font-medium text-violet-300/90 transition hover:text-white hover:underline"
              >
                {t("marketing.showcase.jump")} →
              </Link>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}

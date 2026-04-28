"use client";

import Image from "next/image";
import { Caveat } from "next/font/google";
import { barlowCondensedLanding, outfitLanding } from "@/lib/fonts-landing";
import { useMemo, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  MotionA,
  MotionLink,
  TiltSurface,
  LiftCard,
  InteractiveChip,
  LANDING_EASE,
  LANDING_SPRING,
  staggerParent,
  staggerReduceMotionParent,
  staggerChild,
  staggerInstantChild,
  marketingFadeViewport,
} from "@/components/marketing/LandingMotion";
import { useHover3dEnabled } from "@/hooks/use-hover-3d-enabled";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Keyboard,
  LayoutGrid,
  Link2,
  ListTodo,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { TRIAL_BODY } from "@/lib/marketing-copy";
import {
  route5ContactFromWebsiteMailto,
  route5WalkthroughMailto,
} from "@/lib/marketing-mailto";
import { WORKSPACE_THEME_PHOTO, workspacePhotoUrl } from "@/lib/workspace-theme-photos";

const MARKETING_SF_HERO_SRC = workspacePhotoUrl(WORKSPACE_THEME_PHOTO.sanfrancisco.path, 2400);
const MARKETING_SF_COAST_SRC = workspacePhotoUrl(WORKSPACE_THEME_PHOTO.lagunabeach.path, 1600);

const marketingAccentScript = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export default function MarketingHomeClient({
  signedIn = false,
}: {
  signedIn?: boolean;
}) {
  const { t } = useI18n();
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const hover3d = useHover3dEnabled();
  const fadeUpViewport = marketingFadeViewport(reduceMotion);
  const heroStaggerParent = reduceMotion ? staggerReduceMotionParent : staggerParent;
  const heroStaggerChild = reduceMotion ? staggerInstantChild : staggerChild;
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroBgY = useTransform(scrollYProgress, [0, 1], [0, 56]);
  const heroBgScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);

  const ticker = useMemo(
    () => ["1", "2", "3", "4", "5", "6"].map((k) => t(`landing.ticker.${k}`)),
    [t]
  );

  return (
    <div className={`bg-gradient-to-b from-slate-50 via-white to-indigo-50/35 text-slate-900 ${outfitLanding.variable}`}>
      {/* Hero — SF / Golden Gate photography + scrims (workspace “sanfrancisco” theme family) */}
      <section
        ref={heroRef}
        id="hero"
        aria-label="Product introduction"
        className={`relative min-h-[min(92dvh,44rem)] overflow-hidden border-b border-slate-900/20 pb-16 sm:min-h-[min(90dvh,48rem)] sm:pb-24 ${signedIn ? "pt-[calc(8.25rem+env(safe-area-inset-top,0px))]" : "pt-[calc(4.5rem+env(safe-area-inset-top,0px))]"}`}
      >
        <motion.div
          className="absolute inset-0 z-0 min-h-full overflow-hidden bg-slate-900"
          style={
            reduceMotion
              ? undefined
              : {
                  y: heroBgY,
                  scale: heroBgScale,
                }
          }
        >
          <Image
            src={MARKETING_SF_HERO_SRC}
            alt="San Francisco — Golden Gate Bridge and bay"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_38%] sm:object-[center_36%]"
            quality={88}
          />
        </motion.div>
        {/* Readability: left column for copy */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-slate-950/[0.98] via-slate-950/[0.92] to-slate-900/28"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-slate-950/[0.96] via-slate-950/35 to-indigo-950/4"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_100%_80%_at_100%_42%,rgba(34,211,238,0.12),transparent_54%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] ring-1 ring-inset ring-white/10"
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:min-h-[min(70dvh,36rem)] lg:grid-cols-12 lg:gap-16 lg:px-10">
          <motion.div
            className="rounded-[28px] border border-white/14 bg-slate-950/65 p-5 shadow-[0_28px_100px_-36px_rgba(0,0,0,0.92)] ring-1 ring-white/18 backdrop-blur-xl sm:p-8 lg:col-span-7"
            variants={heroStaggerParent}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={heroStaggerChild}>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
                {t("landing.hero.badge")}
              </span>
            </motion.div>
            <motion.h1
              variants={heroStaggerChild}
              className={`mt-6 text-[clamp(2.65rem,6.8vw,4.05rem)] font-extrabold leading-[1.02] tracking-[-0.038em] text-white [text-shadow:0_3px_36px_rgba(0,0,0,0.72)] ${barlowCondensedLanding.variable} font-[family-name:var(--font-barlow-condensed-landing)]`}
            >
              {t("landing.hero.title1")}{" "}
              <span
                className={`${marketingAccentScript.className} text-[clamp(2.15rem,5.6vw,3.25rem)] font-semibold italic text-sky-200 [text-shadow:0_8px_44px_rgba(0,0,0,0.72)]`}
              >
                {t("landing.hero.title2")}
              </span>
            </motion.h1>
            <motion.p
              variants={heroStaggerChild}
              className="mt-6 max-w-xl text-pretty font-[family-name:var(--font-outfit-landing)] text-[17px] font-medium leading-relaxed text-white/96"
            >
              {t("landing.hero.lead")}
            </motion.p>
            <motion.p
              variants={heroStaggerChild}
              className="mt-4 max-w-xl font-[family-name:var(--font-outfit-landing)] text-[15px] leading-relaxed text-zinc-200"
            >
              {TRIAL_BODY}
            </motion.p>
            <motion.div
              variants={heroStaggerChild}
              className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <MotionLink
                href={signedIn ? "/desk" : "/sign-up"}
                className="inline-flex min-h-[3.25rem] min-w-[11rem] items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 px-10 text-[16px] font-semibold text-white shadow-[0_22px_50px_-18px_rgba(37,99,235,0.75)] ring-1 ring-white/25 transition-colors hover:from-blue-400 hover:to-blue-500"
                whileHover={
                  reduceMotion ? undefined : { scale: 1.03, y: -2, transition: LANDING_SPRING }
                }
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                {signedIn ? t("landing.hero.ctaOpenDesk") : t("landing.hero.ctaPrimary")}
              </MotionLink>
              <MotionA
                href={route5WalkthroughMailto()}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-900/40 bg-white px-8 text-[15px] font-semibold text-slate-900 shadow-lg shadow-black/25 ring-1 ring-white/40 transition-colors hover:bg-zinc-100"
                whileHover={
                  reduceMotion ? undefined : { scale: 1.02, y: -1, transition: LANDING_SPRING }
                }
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              >
                {t("landing.hero.ctaSecondary")}
              </MotionA>
              <MotionLink
                href="/product"
                className="inline-flex min-h-12 items-center justify-center gap-1.5 text-[15px] font-medium text-white/90 underline-offset-4 transition-colors hover:text-white hover:underline sm:px-2"
                whileHover={
                  reduceMotion ? undefined : { x: 3, transition: LANDING_SPRING }
                }
              >
                {t("landing.hero.ctaProduct")}
                <motion.span
                  aria-hidden
                  className="inline-flex"
                  whileHover={
                    reduceMotion ? undefined : { x: 4, transition: LANDING_SPRING }
                  }
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </motion.span>
              </MotionLink>
            </motion.div>
            <motion.p
              variants={heroStaggerChild}
              className="mt-5 text-[12px] font-medium tracking-wide text-zinc-300"
            >
              {t("landing.trial")}
            </motion.p>
          </motion.div>

          <motion.div
            className="relative lg:col-span-5"
            initial={
              reduceMotion
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 28, ...(hover3d ? { rotateX: 6 } : {}) }
            }
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.75, delay: 0.14, ease: LANDING_EASE }}
            style={{ perspective: 1200 }}
          >
            <TiltSurface float className="w-full">
              <div className="rounded-2xl border border-white/45 bg-white p-6 shadow-[0_28px_90px_-36px_rgba(37,99,235,0.55),0_0_0_1px_rgba(255,255,255,0.65)_inset] backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <p className="text-[13px] font-semibold text-slate-800">{t("landing.hero.mockTitle")}</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Live
                </span>
              </div>
              <ul className="mt-4 space-y-3 text-[13px] text-slate-700">
                <li className="flex gap-3 rounded-xl bg-slate-50/90 px-3 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                  <span>{t("landing.hero.mock1")}</span>
                </li>
                <li className="flex gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-blue-100">
                  <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden />
                  <span className="font-medium">{t("landing.hero.mock2")}</span>
                </li>
                <li className="flex gap-3 rounded-xl bg-slate-50/90 px-3 py-2.5">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span>{t("landing.hero.mock3")}</span>
                </li>
              </ul>
              {reduceMotion ? (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-slate-200/90 bg-gradient-to-r from-slate-50/90 to-blue-50/40 px-3 py-2 text-[11px] text-slate-600">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden />
                  Desk → commitments with owners & dates
                </div>
              ) : (
                <motion.div
                  className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-slate-200/90 bg-gradient-to-r from-slate-50/90 to-blue-50/40 px-3 py-2 text-[11px] text-slate-600"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden />
                  Desk → commitments with owners & dates
                </motion.div>
              )}
              </div>
            </TiltSurface>
          </motion.div>
        </div>
        {/* Bay-fog accent — matches workspace “sanfrancisco” gradient family */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-1 bg-gradient-to-r from-slate-300/90 via-sky-300/85 to-violet-300/85 opacity-90"
          aria-hidden
        />
      </section>

      {/* Ticker */}
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.97),rgba(238,242,255,0.88))]">
        <div className="relative overflow-hidden py-3.5">
          <div className="landing-fortune-marquee-track flex w-max gap-16 px-6">
            {[0, 1].map((dup) => (
              <div
                key={dup}
                className="flex shrink-0 items-center gap-16"
                aria-hidden={dup === 1}
              >
                {ticker.map((item) => (
                  <span
                    key={`${dup}-${item}`}
                    className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust + Why */}
      <section
        id="why-route5"
        className="relative overflow-hidden border-b border-slate-200 bg-white py-20 sm:py-28"
      >
        <div className="pointer-events-none absolute -right-16 bottom-0 top-0 z-0 hidden w-[min(52vw,28rem)] sm:block">
          <Image
            src={MARKETING_SF_COAST_SRC}
            alt=""
            fill
            sizes="(min-width: 640px) 28rem, 0px"
            className="object-cover object-[72%_42%] opacity-[0.09]"
            quality={75}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-white via-white/95 to-white/88"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_70%_60%_at_80%_50%,rgba(186,230,253,0.16),transparent_58%)]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <motion.p
            className="text-center text-[15px] font-medium text-slate-500"
            {...fadeUpViewport}
          >
            {t("landing.trust.line")}
          </motion.p>

          <motion.div className="mt-20 text-center" {...fadeUpViewport}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              {t("landing.why.kicker")}
            </p>
            <h2 className="mt-4 font-landing-display text-[clamp(1.65rem,3.2vw,2.35rem)] font-semibold tracking-[-0.02em] text-slate-900">
              {t("landing.why.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-slate-600">
              {t("landing.why.lead")}
            </p>
          </motion.div>

          <ul className="mt-14 grid gap-6 md:grid-cols-3">
            {(["p1", "p2", "p3"] as const).map((pid, i) => (
              <li key={pid}>
                <LiftCard
                  className="h-full rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/85 p-7 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.12)]"
                  transition={{ duration: 0.5, ease: LANDING_EASE, delay: i * 0.07 }}
                >
                  <p className="font-landing-display text-[16px] font-semibold text-slate-900">
                    {t(`landing.why.${pid}.title`)}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                    {t(`landing.why.${pid}.body`)}
                  </p>
                </LiftCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Solution band */}
      <section className="relative overflow-hidden border-b border-blue-800/25 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 z-[0] bg-slate-950/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[0] opacity-[0.22]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 10% 20%, rgba(255,255,255,0.38), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(56,189,248,0.28), transparent 50%)",
          }}
        />
        <div className="relative z-[1] mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <motion.div className="mx-auto max-w-3xl text-center text-white" {...fadeUpViewport}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/90">
              {t("landing.solution.kicker")}
            </p>
            <h2 className="mt-4 font-landing-display text-[clamp(1.6rem,3vw,2.1rem)] font-semibold leading-tight tracking-[-0.02em] drop-shadow-[0_2px_24px_rgba(0,0,0,0.15)]">
              {t("landing.solution.title")}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-blue-50/95">{t("landing.solution.body")}</p>
          </motion.div>
          <ul className="relative mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: Building2, key: "b1" as const },
              { icon: ListTodo, key: "b2" as const },
              { icon: Zap, key: "b3" as const },
            ].map(({ icon: Icon, key }, i) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 18, rotateX: 6 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: LANDING_EASE }}
                whileHover={
                  hover3d
                    ? {
                        y: -5,
                        rotateX: 3,
                        rotateY: -2,
                        z: 10,
                        transition: LANDING_SPRING,
                      }
                    : { y: -2 }
                }
                className="relative flex gap-4 rounded-2xl border border-white/28 bg-white/[0.18] p-5 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.4)] backdrop-blur-md [transform-style:preserve-3d]"
                style={{ perspective: 900 }}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white drop-shadow-sm" strokeWidth={2} aria-hidden />
                <p className="text-[14px] font-medium leading-relaxed text-white [text-shadow:0_1px_18px_rgba(0,0,0,0.22)]">{t(`landing.solution.${key}`)}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-slate-50/50 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <motion.div className="text-center" {...fadeUpViewport}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              {t("landing.how.kicker")}
            </p>
            <h2 className="mt-3 font-landing-display text-[clamp(1.6rem,3vw,2.1rem)] font-semibold text-slate-900">
              {t("landing.how.title")}
            </h2>
          </motion.div>
          <ol className="mt-14 grid gap-8 md:grid-cols-3">
            {(
              [
                { n: "1", k: "s1" as const, icon: Building2 },
                { n: "2", k: "s2" as const, icon: MessageSquare },
                { n: "3", k: "s3" as const, icon: Keyboard },
              ] as const
            ).map(({ n, k, icon: Icon }, i) => (
              <li key={k}>
                <LiftCard
                  className="relative h-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-7 shadow-[0_16px_40px_-24px_rgba(30,64,175,0.18)] ring-1 ring-slate-100/80"
                  transition={{ duration: 0.48, ease: LANDING_EASE, delay: i * 0.07 }}
                >
                  <motion.span
                    className="font-landing-display text-3xl font-bold text-blue-100"
                    initial={{ opacity: 0.6, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
                  >
                    {n}
                  </motion.span>
                  <Icon className="mt-4 h-6 w-6 text-blue-600" aria-hidden />
                  <p className="mt-3 font-landing-display text-[17px] font-semibold text-slate-900">
                    {t(`landing.how.${k}.title`)}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                    {t(`landing.how.${k}.body`)}
                  </p>
                </LiftCard>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bento / workspace */}
      <section
        id="workspace"
        className="border-b border-slate-200 bg-white py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <motion.div className="max-w-2xl" {...fadeUpViewport}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              {t("landing.bento.kicker")}
            </p>
            <h2 className="mt-3 font-landing-display text-[clamp(1.65rem,3.2vw,2.3rem)] font-semibold text-slate-900">
              {t("landing.bento.title")}
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-slate-600">{t("landing.bento.subtitle")}</p>
          </motion.div>
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(["1", "2", "3", "4", "5", "6"] as const).map((id, i) => (
              <li key={id}>
                <LiftCard
                  className="h-full rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/85 p-6 ring-1 ring-slate-100/90"
                  transition={{ duration: 0.45, ease: LANDING_EASE, delay: i * 0.04 }}
                >
                  <LayoutGrid className="h-5 w-5 text-blue-600" aria-hidden />
                  <p className="mt-4 font-landing-display text-[15px] font-semibold text-slate-900">
                    {t(`landing.bento.${id}.title`)}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                    {t(`landing.bento.${id}.body`)}
                  </p>
                </LiftCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Integrations */}
      <section
        id="integrations"
        className="border-b border-slate-200 bg-slate-50/80 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8 lg:px-10">
          <motion.div {...fadeUpViewport}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              {t("landing.integrations.kicker")}
            </p>
            <h2 className="mt-3 font-landing-display text-[clamp(1.4rem,2.6vw,1.85rem)] font-semibold text-slate-900">
              {t("landing.integrations.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              {t("landing.integrations.line")}
            </p>
          </motion.div>
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[12px] font-semibold text-slate-600"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.05, delayChildren: 0.08 },
              },
            }}
          >
            {["Slack", "Google", "Linear", "GitHub", "Notion", "Figma", "OpenAI"].map((name) => (
              <motion.div
                key={name}
                variants={{
                  hidden: { opacity: 0, y: 10, rotateX: 8 },
                  show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.45, ease: LANDING_EASE } },
                }}
                className="[perspective:800px]"
              >
                <InteractiveChip className="inline-block rounded-full border border-slate-200/90 bg-white px-3 py-1.5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)] ring-1 ring-white/80">
                  {name}
                </InteractiveChip>
              </motion.div>
            ))}
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300/90 bg-white/60 px-3 py-1.5 text-slate-500 backdrop-blur-sm"
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden />
              more
            </motion.span>
          </motion.div>
        </div>
      </section>

      {/* Who */}
      <section
        id="who-its-for"
        className="border-b border-slate-200 bg-white py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <motion.div className="max-w-2xl" {...fadeUpViewport}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              {t("landing.teams.kicker")}
            </p>
            <h2 className="mt-3 font-landing-display text-[clamp(1.6rem,3vw,2.05rem)] font-semibold text-slate-900">
              {t("landing.teams.title")}
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-slate-600">{t("landing.teams.lead")}</p>
          </motion.div>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {(
              [
                { k: "c1" as const, icon: Users },
                { k: "c2" as const, icon: Shield },
                { k: "c3" as const, icon: Building2 },
              ] as const
            ).map(({ k, icon: Icon }, idx) => (
              <li key={k}>
                <LiftCard
                  className="h-full rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white p-8 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.12)]"
                  transition={{ duration: 0.48, ease: LANDING_EASE, delay: idx * 0.07 }}
                >
                  <Icon className="h-6 w-6 text-blue-600" strokeWidth={1.75} aria-hidden />
                  <p className="mt-5 font-landing-display text-[16px] font-semibold text-slate-900">
                    {t(`landing.teams.${k}.title`)}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                    {t(`landing.teams.${k}.body`)}
                  </p>
                </LiftCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA — id=contact for nav / footer */}
      <section
        id="contact"
        className="bg-gradient-to-b from-slate-50 to-white py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <motion.div
            className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-br from-white via-white to-sky-50/55 p-10 shadow-[0_36px_110px_-52px_rgba(37,99,235,0.35)] ring-1 ring-sky-100/80 sm:p-12"
            {...fadeUpViewport}
            whileHover={
              reduceMotion ? undefined : { y: -4, transition: LANDING_SPRING }
            }
          >
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-sky-200/40 to-blue-400/25 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                  {t("landing.cta.kicker")}
                </p>
                <h2 className="mt-3 font-landing-display text-[clamp(1.35rem,2.5vw,1.9rem)] font-semibold text-slate-900">
                  {t("landing.cta.title")}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{t("landing.cta.body")}</p>
              </div>
              <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-end">
                <MotionA
                  href={route5ContactFromWebsiteMailto()}
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-8 text-[15px] font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.55)] ring-1 ring-white/25 transition-colors hover:bg-blue-700"
                  whileHover={
                    reduceMotion ? undefined : { scale: 1.03, y: -2, transition: LANDING_SPRING }
                  }
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  {t("landing.cta.email")}
                </MotionA>
                <MotionLink
                  href={signedIn ? "/desk" : "/sign-up"}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 px-8 text-[15px] font-semibold text-slate-800 shadow-sm ring-1 ring-white/90 transition-colors hover:border-blue-200/90"
                  whileHover={
                    reduceMotion ? undefined : { scale: 1.02, y: -1, transition: LANDING_SPRING }
                  }
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                >
                  {signedIn ? t("landing.hero.ctaOpenDesk") : t("landing.cta.signup")}
                </MotionLink>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

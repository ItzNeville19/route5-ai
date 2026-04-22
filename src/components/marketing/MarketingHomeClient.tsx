"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Box, Layers3, LayoutGrid, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { TRIAL_BODY, TRIAL_SUBLINE } from "@/lib/marketing-copy";

const TILE_IDS = ["capture", "desk", "signal", "integrations", "identity", "evidence"] as const;

function TiltPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 280, damping: 28 });
  const springY = useSpring(my, { stiffness: 280, damping: 28 });
  const rx = useTransform(springY, [-0.5, 0.5], [7, -7]);
  const ry = useTransform(springX, [-0.5, 0.5], [-7, 7]);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function MarketingHomeClient() {
  const { t } = useI18n();

  const marqueeItems = useMemo(
    () =>
      ["m1", "m2", "m3", "m4", "m5", "m6"].map((k) => t(`marketing.home.marquee.${k}`)),
    [t]
  );

  const steps = useMemo(
    () =>
      [
        { key: "s1", icon: Zap },
        { key: "s2", icon: Layers3 },
        { key: "s3", icon: Sparkles },
      ] as const,
    []
  );

  return (
    <>
      {/* Hero */}
      <section
        id="hero"
        className="relative overflow-hidden border-b border-white/[0.06] pb-20 pt-[calc(5rem+env(safe-area-inset-top,0px))] sm:pb-28 sm:pt-[5.75rem]"
      >
        <motion.div
          className="pointer-events-none absolute -left-[20%] top-[-30%] h-[min(90vh,720px)] w-[min(100vw,900px)] rounded-[50%] blur-[100px]"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(56,189,248,0.22), transparent 55%), radial-gradient(circle at 70% 60%, rgba(251,191,36,0.07), transparent 50%)",
          }}
          animate={{ opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-[1280px] gap-16 px-5 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:px-10">
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/95">
                {t("marketing.home.hero.kicker")}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("marketing.home.hero.subkicker")}
              </span>
            </div>
            <h1 className="font-landing-display mt-7 max-w-[20ch] text-balance text-[clamp(2.5rem,6.8vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.038em] text-white lg:max-w-none">
              {t("marketing.home.hero.titleTop")}
              <span className="mt-[0.06em] block bg-gradient-to-r from-cyan-200 via-white to-amber-100 bg-clip-text text-transparent">
                {t("marketing.home.hero.titleAccent")}
              </span>
            </h1>
            <p className="mt-8 max-w-[40rem] text-pretty text-[clamp(1.06rem,1.9vw,1.22rem)] leading-[1.65] text-slate-400">
              {t("marketing.home.hero.lead")}
            </p>
            <p className="mt-5 max-w-[40rem] text-[14px] leading-relaxed text-slate-500">{TRIAL_BODY}</p>
            <div className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-9 text-[15px] font-semibold text-slate-950 shadow-[0_24px_60px_-28px_rgba(34,211,238,0.55)] ring-1 ring-white/15 transition hover:brightness-110 active:scale-[0.99] sm:w-auto"
              >
                {t("marketing.home.hero.ctaPrimary")}
              </Link>
              <a
                href="mailto:neville@rayze.xyz?subject=Route5%20—%20Enterprise%20briefing"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/14 bg-white/[0.04] px-9 text-[15px] font-semibold text-zinc-100 backdrop-blur-md transition hover:border-amber-400/35 hover:bg-white/[0.07] active:scale-[0.99] sm:w-auto"
              >
                {t("marketing.home.hero.ctaSales")}
              </a>
              <Link
                href="/product"
                className="inline-flex min-h-12 w-full items-center justify-center gap-1 text-[14px] font-medium text-slate-500 underline-offset-4 transition hover:text-slate-300 hover:underline sm:w-auto sm:px-2"
              >
                {t("marketing.home.hero.ctaProduct")}
                <ArrowRight className="h-4 w-4 opacity-70" aria-hidden />
              </Link>
            </div>
            <p className="mt-6 text-[12px] tracking-wide text-slate-600">{TRIAL_SUBLINE}</p>

            <motion.ul
              className="mt-12 flex flex-wrap gap-3"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              {steps.map(({ key, icon: Icon }) => (
                <motion.li
                  key={key}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0 },
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#070b14]/75 px-4 py-3 text-[13px] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md"
                >
                  <Icon className="h-4 w-4 shrink-0 text-cyan-300/90" aria-hidden />
                  <span className="font-medium text-slate-200">{t(`marketing.home.flow.${key}`)}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            className="relative flex flex-col justify-center lg:col-span-5"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative [perspective:1400px]">
              <TiltPanel className="relative rounded-[28px] border border-white/10 bg-gradient-to-br from-[#050c18]/95 via-[#061525]/90 to-[#020617] p-[1px] shadow-[0_40px_120px_-48px_rgba(34,211,238,0.35)]">
                <div className="rounded-[27px] bg-[#050b14]/95 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
                    <Box className="h-4 w-4" aria-hidden />
                    {t("marketing.home.stage.label")}
                  </div>
                  <p className="font-landing-display mt-6 text-[clamp(1.6rem,3.4vw,2.1rem)] font-semibold tracking-[-0.03em] text-white">
                    {t("marketing.home.stage.title")}
                  </p>
                  <p className="mt-4 text-[14px] leading-relaxed text-slate-400">{t("marketing.home.stage.body")}</p>
                  <div className="mt-8 grid gap-3 text-[12px] text-slate-500">
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span>{t("marketing.home.stage.row1")}</span>
                      <span className="font-mono text-cyan-300/90">●</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span>{t("marketing.home.stage.row2")}</span>
                      <span className="font-mono text-amber-200/90">●</span>
                    </div>
                  </div>
                  <p className="mt-6 text-[11px] leading-relaxed text-slate-600">{t("marketing.home.stage.disclaimer")}</p>
                </div>
              </TiltPanel>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <div className="border-y border-white/[0.06] bg-black/40">
        <div className="relative overflow-hidden py-4">
          <div className="landing-fortune-marquee-track flex w-max gap-16 px-6">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center gap-16" aria-hidden={dup === 1}>
                {marqueeItems.map((item) => (
                  <span
                    key={`${dup}-${item}`}
                    className="route5-landing-section-label whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform bento */}
      <section id="platform" className="relative border-b border-white/[0.06] bg-[#020617] py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.08),transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/85">{t("marketing.home.platform.kicker")}</p>
            <h2 className="font-landing-display mt-4 text-[clamp(1.65rem,3.4vw,2.45rem)] font-semibold tracking-[-0.028em] text-white">
              {t("marketing.home.platform.title")}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-500">{t("marketing.home.platform.subtitle")}</p>
          </motion.div>

          <ul className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {TILE_IDS.map((id, i) => (
              <motion.li
                key={id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
              >
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0a1428]/95 to-[#030712] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-300 hover:border-cyan-400/25 hover:shadow-[0_28px_80px_-48px_rgba(34,211,238,0.18)]">
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gradient-to-br from-cyan-400/18 to-amber-400/10 opacity-90 blur-3xl transition duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                  <LayoutGrid className="relative h-5 w-5 text-cyan-300/80" aria-hidden />
                  <p className="font-landing-display relative mt-5 text-[15px] font-semibold tracking-wide text-white">
                    {t(`marketing.home.tile.${id}.title`)}
                  </p>
                  <p className="relative mt-3 text-[13px] leading-relaxed text-slate-500">
                    {t(`marketing.home.tile.${id}.body`)}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Differentiation */}
      <section id="story" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">{t("marketing.home.story.kicker")}</p>
            <h2 className="font-landing-display mt-4 text-[clamp(1.5rem,3vw,2.15rem)] font-semibold tracking-[-0.02em] text-white">
              {t("marketing.home.story.title")}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-500">{t("marketing.home.story.lead")}</p>
          </motion.div>
          <ul className="grid flex-1 gap-4 sm:grid-cols-3 lg:max-w-[820px] lg:gap-5">
            {["p1", "p2", "p3"].map((pid, idx) => (
              <motion.li
                key={pid}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="rounded-xl border border-white/[0.08] bg-[#070b14]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
              >
                <p className="font-landing-display text-[13px] font-semibold uppercase tracking-wide text-white">
                  {t(`marketing.home.pillar.${pid}.title`)}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{t(`marketing.home.pillar.${pid}.body`)}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Audiences */}
      <section id="audiences" className="border-t border-white/[0.06] bg-[#020617] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <motion.div
            className="mb-14 max-w-xl"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/85">{t("marketing.home.audience.kicker")}</p>
            <h2 className="font-landing-display mt-4 text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-white">
              {t("marketing.home.audience.title")}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{t("marketing.home.audience.lead")}</p>
          </motion.div>
          <ul className="grid gap-6 md:grid-cols-3">
            {["leadership", "operators", "procurement"].map((aud, idx) => (
              <motion.li
                key={aud}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: idx * 0.07 }}
                className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0a1422] to-[#050916] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <ShieldCheck className="h-5 w-5 text-cyan-300/75" aria-hidden />
                <p className="font-landing-display mt-5 text-[15px] font-semibold text-white">{t(`marketing.home.audience.${aud}.title`)}</p>
                <p className="mt-4 text-[14px] leading-relaxed text-slate-500">{t(`marketing.home.audience.${aud}.body`)}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] bg-gradient-to-b from-[#020617] via-[#030a14] to-black">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <motion.div
            className="flex flex-col gap-12 rounded-[28px] border border-cyan-500/15 bg-[#071021]/92 p-10 shadow-[0_36px_100px_-52px_rgba(34,211,238,0.25)] sm:flex-row sm:items-center sm:justify-between sm:p-12"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.55 }}
          >
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/85">{t("marketing.home.cta.kicker")}</p>
              <h2 className="font-landing-display mt-4 text-[clamp(1.35rem,2.6vw,1.95rem)] font-semibold tracking-[-0.02em] text-white">
                {t("marketing.home.cta.title")}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{t("marketing.home.cta.body")}</p>
            </div>
            <div className="flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:shrink-0">
              <a
                href="mailto:neville@rayze.xyz?subject=Route5%20—%20Enterprise"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-9 text-[14px] font-semibold text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:brightness-110 sm:w-auto"
              >
                {t("marketing.home.cta.primary")}
              </a>
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/18 px-9 text-[14px] font-semibold text-zinc-100 transition hover:border-amber-400/40 sm:w-auto"
              >
                {t("marketing.home.cta.secondary")}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

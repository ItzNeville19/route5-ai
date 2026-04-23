"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

export default function MarketingHomeClient() {
  const { t } = useI18n();

  const ticker = useMemo(
    () => ["1", "2", "3", "4", "5", "6"].map((k) => t(`landing.ticker.${k}`)),
    [t]
  );

  return (
    <div className="bg-white text-slate-900">
      {/* Hero — white / sky / blue wash (Godmode-adjacent clarity, Route5 product) */}
      <section
        id="hero"
        className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-white via-sky-50/90 to-blue-50/70 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] pb-16 sm:pb-24"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_70%_-10%,rgba(59,130,246,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-10">
          <motion.div className="lg:col-span-7" {...fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur-sm">
              {t("landing.hero.badge")}
            </div>
            <h1 className="mt-6 font-landing-display text-[clamp(2.25rem,6vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-slate-900">
              {t("landing.hero.title1")}{" "}
              <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                {t("landing.hero.title2")}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-slate-600">
              {t("landing.hero.lead")}
            </p>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-500">{TRIAL_BODY}</p>
            <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
              >
                {t("landing.hero.ctaPrimary")}
              </Link>
              <a
                href="mailto:neville@rayze.xyz?subject=Route5%20—%20walkthrough"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-[15px] font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-slate-50"
              >
                {t("landing.hero.ctaSecondary")}
              </a>
              <Link
                href="/product"
                className="inline-flex min-h-12 items-center justify-center gap-1 text-[15px] font-medium text-slate-500 underline-offset-4 transition hover:text-blue-700 hover:underline sm:px-2"
              >
                {t("landing.hero.ctaProduct")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-5 text-[12px] font-medium tracking-wide text-slate-500">{t("landing.trial")}</p>
          </motion.div>

          <motion.div
            className="relative lg:col-span-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(37,99,235,0.35)]">
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
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2 text-[11px] text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" aria-hidden />
                Desk → tasks with owners & dates
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ticker */}
      <div className="border-b border-slate-200 bg-slate-50/90">
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
        className="border-b border-slate-200 bg-white py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <p className="text-center text-[15px] font-medium text-slate-500">{t("landing.trust.line")}</p>

          <motion.div className="mt-20 text-center" {...fadeUp}>
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
              <motion.li
                key={pid}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-7 shadow-sm"
              >
                <p className="font-landing-display text-[16px] font-semibold text-slate-900">
                  {t(`landing.why.${pid}.title`)}
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                  {t(`landing.why.${pid}.body`)}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Solution band */}
      <section className="border-b border-blue-700/20 bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/90">
              {t("landing.solution.kicker")}
            </p>
            <h2 className="mt-4 font-landing-display text-[clamp(1.6rem,3vw,2.1rem)] font-semibold leading-tight tracking-[-0.02em]">
              {t("landing.solution.title")}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-blue-50/95">{t("landing.solution.body")}</p>
          </div>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: Building2, key: "b1" as const },
              { icon: ListTodo, key: "b2" as const },
              { icon: Zap, key: "b3" as const },
            ].map(({ icon: Icon, key }) => (
              <li
                key={key}
                className="flex gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white" strokeWidth={2} aria-hidden />
                <p className="text-[14px] leading-relaxed text-white/95">{t(`landing.solution.${key}`)}</p>
              </li>
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
          <motion.div className="text-center" {...fadeUp}>
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
            ).map(({ n, k, icon: Icon }) => (
              <li
                key={k}
                className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <span className="font-landing-display text-3xl font-bold text-blue-100">{n}</span>
                <Icon className="mt-4 h-6 w-6 text-blue-600" aria-hidden />
                <p className="mt-3 font-landing-display text-[17px] font-semibold text-slate-900">
                  {t(`landing.how.${k}.title`)}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                  {t(`landing.how.${k}.body`)}
                </p>
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
          <motion.div className="max-w-2xl" {...fadeUp}>
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
              <motion.li
                key={id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-6 transition hover:border-blue-200 hover:shadow-md"
              >
                <LayoutGrid className="h-5 w-5 text-blue-600" aria-hidden />
                <p className="mt-4 font-landing-display text-[15px] font-semibold text-slate-900">
                  {t(`landing.bento.${id}.title`)}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  {t(`landing.bento.${id}.body`)}
                </p>
              </motion.li>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
            {t("landing.integrations.kicker")}
          </p>
          <h2 className="mt-3 font-landing-display text-[clamp(1.4rem,2.6vw,1.85rem)] font-semibold text-slate-900">
            {t("landing.integrations.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            {t("landing.integrations.line")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[12px] font-semibold text-slate-500">
            {["Slack", "Google", "Linear", "GitHub", "Notion", "Figma", "OpenAI"].map((name) => (
              <span
                key={name}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
              >
                {name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-slate-500">
              <Link2 className="h-3.5 w-3.5" aria-hidden />
              more
            </span>
          </div>
        </div>
      </section>

      {/* Who */}
      <section
        id="who-its-for"
        className="border-b border-slate-200 bg-white py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <motion.div className="max-w-2xl" {...fadeUp}>
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
              <motion.li
                key={k}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: idx * 0.07 }}
                className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-8 shadow-sm"
              >
                <Icon className="h-6 w-6 text-blue-600" strokeWidth={1.75} aria-hidden />
                <p className="mt-5 font-landing-display text-[16px] font-semibold text-slate-900">
                  {t(`landing.teams.${k}.title`)}
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                  {t(`landing.teams.${k}.body`)}
                </p>
              </motion.li>
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
            className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white to-sky-50/60 p-10 shadow-[0_32px_100px_-48px_rgba(37,99,235,0.25)] sm:p-12"
            {...fadeUp}
          >
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
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
                <a
                  href="mailto:neville@rayze.xyz?subject=Route5"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  {t("landing.cta.email")}
                </a>
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-[15px] font-semibold text-slate-800 transition hover:border-blue-300"
                >
                  {t("landing.cta.signup")}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

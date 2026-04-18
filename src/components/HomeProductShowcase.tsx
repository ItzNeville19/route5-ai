"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, BookOpen, LayoutList } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { easeApple, staggerContainer, staggerItemTight } from "@/lib/motion";

type Tile = {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
  className?: string;
};

/** Logged-out home: primary workspace surfaces (Feed, Overview, product story). */
export default function HomeProductShowcase() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const tiles: Tile[] = [
    {
      href: "/feed",
      icon: <LayoutList className="h-6 w-6" strokeWidth={1.75} aria-hidden />,
      title: t("marketing.showcase.feedTitle"),
      body: t("marketing.showcase.feedBody"),
      className: "lg:col-span-2 min-h-[200px]",
    },
    {
      href: "/overview",
      icon: <BarChart3 className="h-6 w-6" strokeWidth={1.75} aria-hidden />,
      title: t("marketing.showcase.projectsTitle"),
      body: t("marketing.showcase.projectsBody"),
      className: "lg:col-span-2 min-h-[200px]",
    },
    {
      href: "/product",
      icon: <BookOpen className="h-6 w-6" strokeWidth={1.75} aria-hidden />,
      title: t("marketing.showcase.storyTitle"),
      body: t("marketing.showcase.storyBody"),
      className: "lg:col-span-4",
    },
  ];

  return (
    <section
      id="showcase"
      className="scroll-mt-28 border-t border-white/10 px-5 py-20 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-[1180px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.55, ease: easeApple }}
          className="mx-auto max-w-[820px] text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            {t("marketing.showcase.kicker")}
          </p>
          <h2 className="mt-3 text-[clamp(1.55rem,3.8vw,2.15rem)] font-semibold tracking-[-0.035em] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.45)]">
            {t("marketing.showcase.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-300">
            {t("marketing.showcase.subtitle")}
          </p>
        </motion.div>

        <motion.div
          className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-4"
          style={{ perspective: 1200 }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.08 }}
        >
          {tiles.map((tile) => (
            <motion.div
              key={tile.href + tile.title}
              variants={staggerItemTight}
              whileHover={
                reduceMotion
                  ? undefined
                  : { y: -4, transition: { type: "spring", stiffness: 380, damping: 28 } }
              }
              className={tile.className ?? ""}
            >
              <Link
                href={tile.href}
                className="group relative flex h-full min-h-[168px] flex-col overflow-hidden rounded-[22px] border border-white/[0.1] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 text-left shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] transition duration-300 hover:border-violet-400/35 hover:shadow-[0_24px_70px_-36px_rgba(139,92,246,0.35)]"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
                  aria-hidden
                >
                  <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
                  <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
                </div>
                <div className="relative flex items-start justify-between gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-violet-200/95 transition group-hover:border-violet-400/25 group-hover:bg-violet-500/15 group-hover:text-white">
                    {tile.icon}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition group-hover:border-emerald-500/30 group-hover:text-emerald-200/90">
                    {t("marketing.showcase.tileCta")}
                  </span>
                </div>
                <h3 className="relative mt-5 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white">
                  {tile.title}
                </h3>
                <p className="relative mt-2 flex-1 text-[14px] leading-relaxed text-zinc-400 transition group-hover:text-zinc-300">
                  {tile.body}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mx-auto mt-12 max-w-xl text-center text-[13px] leading-relaxed text-zinc-600"
        >
          {t("marketing.showcase.footnote")}
        </motion.p>
      </div>
    </section>
  );
}

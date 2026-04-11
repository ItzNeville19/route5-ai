"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { hasClerkPublishableKey } from "@/lib/clerk-env";

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

export default function Hero() {
  return (
    <section className="relative flex min-h-[min(92dvh,840px)] flex-col justify-center overflow-hidden pt-20">
      <div
        className="liquid-blob pointer-events-none absolute -left-24 top-1/4 h-[min(420px,55vw)] w-[min(420px,55vw)] rounded-full bg-gradient-to-br from-[#c4b5fd]/35 via-[#a78bfa]/25 to-transparent"
        aria-hidden
      />
      <div
        className="liquid-blob liquid-blob-delayed pointer-events-none absolute -right-20 bottom-[18%] h-[min(360px,48vw)] w-[min(360px,48vw)] rounded-full bg-gradient-to-tl from-[#f9a8d4]/22 via-[#a78bfa]/18 to-transparent"
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
            className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45"
          >
            Enterprise intelligence
          </motion.p>

          <motion.h1
            variants={item}
            className="font-semibold tracking-[-0.045em] text-[#1d1d1f]"
            style={{ fontSize: "clamp(2.25rem, 6.5vw, 3.5rem)" }}
          >
            Noise in. Intelligence out.
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-lg text-[clamp(16px,1.8vw,18px)] leading-relaxed text-[#1d1d1f]/58"
          >
            AI-first: paste notes or tickets — a frontier model structures summary,
            decisions, and action items your team can track. Built for leaders who need
            signal, not noise.
          </motion.p>

          {/* Command-style primary surface (workspace IDE family) */}
          <motion.div
            variants={item}
            className="mx-auto mt-10 max-w-xl"
            whileHover={{ y: -2 }}
            transition={cardSpring}
          >
            <div className="glass-liquid glass-liquid-interactive rounded-[1.35rem] p-[1px] text-left">
              <div className="rounded-[1.28rem] bg-white/45 px-5 py-4 backdrop-blur-md">
                <p className="font-mono text-[11px] text-[#86868b]">
                  route5 / workspace
                </p>
                {hasClerkPublishableKey() ? (
                  <>
                    <Show when="signed-in">
                      <p className="mt-2 text-[15px] font-medium text-[#1d1d1f]">
                        You&apos;re signed in — your workspace and projects are ready.
                      </p>
                      <p className="mt-1 text-[13px] leading-snug text-[#6e6e73]">
                        Continue where you left off or open a new project from the
                        dashboard.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link
                          href="/projects"
                          className="inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/marketplace"
                          className="inline-flex rounded-full border border-black/[0.1] bg-white/80 px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-white"
                        >
                          Integrations
                        </Link>
                        <Link
                          href="/settings"
                          className="inline-flex rounded-full border border-black/[0.1] bg-white/80 px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-white"
                        >
                          Settings
                        </Link>
                      </div>
                    </Show>
                    <Show when="signed-out">
                      <p className="mt-2 text-[15px] font-medium text-[#1d1d1f]">
                        One flow: sign in → project → paste → extract.
                      </p>
                      <p className="mt-1 text-[13px] leading-snug text-[#6e6e73]">
                        Same structured outputs every run — honest about what ships
                        today.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link
                          href="/sign-up"
                          className="inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
                        >
                          Create account
                        </Link>
                        <Link
                          href="/login"
                          className="inline-flex rounded-full border border-black/[0.1] bg-white/80 px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-white"
                        >
                          Log in
                        </Link>
                        <Link
                          href="/projects"
                          className="inline-flex rounded-full border border-black/[0.1] bg-white/80 px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-white"
                        >
                          Dashboard
                        </Link>
                      </div>
                    </Show>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-[15px] font-medium text-[#1d1d1f]">
                      One flow: sign in → project → paste → extract.
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-[#6e6e73]">
                      Same structured outputs every run — honest about what ships
                      today.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href="/login"
                        className="inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/contact"
                        className="inline-flex rounded-full border border-black/[0.1] bg-white/80 px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-white"
                      >
                        Contact
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-black/[0.1] bg-white/70 px-7 py-3 text-[14px] font-semibold tracking-[-0.02em] text-[#1d1d1f] shadow-sm backdrop-blur-md transition hover:bg-white"
            >
              Get in touch
            </Link>
            <Link
              href="/pitch"
              className="inline-flex items-center rounded-full px-5 py-3 text-[14px] font-medium tracking-[-0.02em] text-[#0071e3] transition hover:underline"
            >
              What we ship
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

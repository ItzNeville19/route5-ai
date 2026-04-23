"use client";

import { motion } from "framer-motion";

type OverviewDayPeriod = "morning" | "afternoon" | "evening" | "night";

type Props = {
  period: OverviewDayPeriod;
};

function Palm({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 64 120"
      fill="currentColor"
      aria-hidden
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 0.9, y: 0 }}
      transition={{ delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <path
        d="M32 118c-2-20 4-48 2-64-8 12-20 20-32 24 18-4 32-2 32-2s14-2 32 2c-12-4-24-12-32-24-2 16 4 44 2 64h-2z"
        opacity="0.9"
      />
      <path
        d="M32 60c-4-18-12-32-20-40 6 10 8 24 6 40 0-20-4-32-6-40z"
        opacity="0.55"
      />
    </motion.svg>
  );
}

export default function OverviewTimeOfDayArt({ period }: Props) {
  if (period === "morning") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-0 bg-gradient-to-br from-amber-100/90 via-rose-50/80 to-cyan-100/70 dark:from-amber-950/30 dark:via-rose-950/20 dark:to-cyan-950/40"
          aria-hidden
        />
        <motion.div
          className="absolute -right-4 top-8 h-32 w-32 text-amber-300/90 dark:text-amber-500/30"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <span className="block h-full w-full rounded-full bg-gradient-to-br from-amber-200 to-orange-200 opacity-80 blur-2xl dark:opacity-30" />
        </motion.div>
        <Palm className="absolute bottom-0 left-[8%] h-28 w-12 text-emerald-900/35" delay={0.1} />
        <Palm className="absolute -bottom-1 right-[20%] h-36 w-14 text-emerald-900/40" delay={0.25} />
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-20 text-sky-400/45"
          aria-hidden
          initial={{ x: 0 }}
          animate={{ x: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          <svg viewBox="0 0 400 64" className="h-full w-[120%] max-w-none" preserveAspectRatio="none">
            <path
              fill="currentColor"
              d="M0,40 C80,20 120,50 200,32 C280,15 320,45 400,30 L400,64 L0,64Z"
            />
            <path
              fill="currentColor"
              fillOpacity="0.4"
              d="M0,50 C100,60 200,30 300,50 C360,64 400,50 400,50 L400,64 L0,64Z"
            />
          </svg>
        </motion.div>
        <p className="sr-only">Morning beach-inspired backdrop</p>
      </div>
    );
  }

  if (period === "afternoon") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-0 bg-gradient-to-b from-sky-200/70 via-cyan-100/50 to-sky-100/80 dark:from-sky-950/40 dark:via-cyan-950/20 dark:to-slate-900/50"
          aria-hidden
        />
        <div className="absolute bottom-12 left-1/2 w-[min(100%,22rem)] -translate-x-1/2" aria-hidden>
          <div className="h-2 rounded-full bg-sky-300/40 blur-md dark:bg-sky-500/20" />
          <motion.div
            className="-mt-6 h-20 rounded-[50%] border border-sky-300/25 bg-gradient-to-b from-sky-200/30 to-cyan-100/20 dark:from-sky-800/20 dark:to-cyan-900/10"
            style={{ boxShadow: "inset 0 8px 24px rgba(255,255,255,0.35)" }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
        </div>
        <motion.div
          className="absolute right-[12%] top-10 h-4 w-4 rounded-full bg-white/80 shadow-lg dark:bg-white/20"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY }}
        />
        <p className="sr-only">Afternoon lake-inspired backdrop</p>
      </div>
    );
  }

  if (period === "evening") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-0 bg-gradient-to-br from-violet-200/60 via-fuchsia-100/50 to-orange-100/70 dark:from-violet-950/50 dark:via-fuchsia-950/25 dark:to-slate-950/70"
          aria-hidden
        />
        <motion.div
          className="absolute right-6 top-16 h-20 w-20 text-orange-300/85 dark:text-orange-400/25"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <div className="h-full w-full rounded-full bg-gradient-to-br from-orange-200 to-rose-300 opacity-80 blur-sm dark:opacity-40" />
        </motion.div>
        <Palm className="absolute bottom-0 right-[6%] h-32 w-12 text-slate-900/45" delay={0.15} />
        <Palm className="absolute -bottom-1 right-[30%] h-24 w-9 text-slate-900/35" delay={0.3} />
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-24 text-indigo-500/30 dark:text-indigo-300/20"
          animate={{ x: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 500 60" className="h-full w-full" preserveAspectRatio="none">
            <path
              fill="currentColor"
              d="M0,35 C120,20 200,50 300,32 C400,12 450,40 500,30 L500,60 L0,60Z"
            />
          </svg>
        </motion.div>
        <p className="sr-only">Evening ocean-inspired backdrop with palms</p>
      </div>
    );
  }

  /* night */
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-indigo-950/60 to-slate-900/95"
        aria-hidden
      />
      {[
        [12, 8, 0.2],
        [25, 18, 0.4],
        [40, 12, 0.2],
        [60, 22, 0.3],
        [70, 10, 0.2],
        [80, 30, 0.35],
        [88, 16, 0.25],
      ].map(([l, t, o], i) => (
        <motion.span
          key={`${l}-${t}`}
          className="absolute h-0.5 w-0.5 rounded-full bg-white"
          style={{ left: `${l}%`, top: `${t}%`, opacity: o }}
          animate={{ opacity: [o, 1, o] }}
          transition={{ duration: 2 + (i % 3), repeat: Number.POSITIVE_INFINITY, delay: i * 0.2 }}
        />
      ))}
      <Palm className="absolute bottom-0 right-[15%] h-28 w-10 text-slate-950/80" delay={0.2} />
      <Palm className="absolute -bottom-1 right-[32%] h-20 w-7 text-slate-950/70" delay={0.35} />
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-indigo-950/80 to-transparent" aria-hidden />
      <p className="sr-only">Night sky backdrop with stars</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BellRing, Bot, ShieldCheck } from "lucide-react";
import { easeApple } from "@/lib/motion";

const SNAPSHOTS = [
  {
    title: "Capture turns into ownership",
    body: "Paste notes, threads, or email and confirm owners and deadlines in under a minute.",
    icon: Bot,
    badge: "Instant capture",
  },
  {
    title: "Follow-up runs automatically",
    body: "Route5 nudges owners before work slips and escalates when commitments go quiet.",
    icon: BellRing,
    badge: "Always on",
  },
  {
    title: "Leadership sees execution live",
    body: "Know what is on track, at risk, and overdue without chasing updates in meetings.",
    icon: ShieldCheck,
    badge: "Executive clarity",
  },
] as const;

export default function HomeExecutionSnapshot() {
  return (
    <section className="scroll-mt-24 border-t border-white/10 px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1180px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: easeApple }}
          className="mx-auto max-w-[860px] text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Why teams keep Route5</p>
          <h2 className="mt-3 text-[clamp(1.65rem,4vw,2.4rem)] font-semibold tracking-[-0.04em] text-white">
            Decisions become execution without manual chasing
          </h2>
          <p className="mx-auto mt-4 max-w-[680px] text-[16px] leading-relaxed text-zinc-300">
            Route5 sits between communication and execution so commitments stay visible, owned, and followed through.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {SNAPSHOTS.map((snapshot) => {
            const Icon = snapshot.icon;
            return (
              <article
                key={snapshot.title}
                className="workspace-preview-panel rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-violet-200">
                    <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                    {snapshot.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-white">{snapshot.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{snapshot.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/desk"
            className="inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-violet-500/15 px-6 py-3 text-[14px] font-semibold text-violet-100 transition hover:border-violet-300/55 hover:bg-violet-500/25"
          >
            Open Desk
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

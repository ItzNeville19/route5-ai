"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const TRACKS = [
  {
    id: "leadership",
    label: "Leadership",
    headline: "See drift before it becomes a deck problem.",
    sub: "One place for overdue, at-risk, and owner load—updated as decisions move.",
    bullets: [
      "Accountability map by team, owner, and due pressure.",
      "Escalations when commitments cross thresholds.",
      "Digest-ready views for operating reviews.",
    ],
    stat: { a: "−38%", b: "time to surface risk", tone: "emerald" as const },
  },
  {
    id: "operations",
    label: "Operations",
    headline: "Turn decisions into owned work without manual cleanup.",
    sub: "Capture stays close to where conversations happen; Route5 enforces structure.",
    bullets: [
      "Ingest from meetings, chat, and mail into one stream.",
      "Owners and deadlines stay attached to the originating decision.",
      "Project-scoped channels for execution context.",
    ],
    stat: { a: "6.2h", b: "median time to owner", tone: "zinc" as const },
  },
  {
    id: "teams",
    label: "Teams",
    headline: "Accountability as a daily behavior.",
    sub: "Roles, invites, and project membership mirror how you actually run the org.",
    bullets: [
      "Organization roles with clear permissions.",
      "Shared projects with explicit membership.",
      "Direct, project, and group messaging tied to work.",
    ],
    stat: { a: "24/7", b: "synced workspace state", tone: "violet" as const },
  },
] as const;

const FAQ = [
  {
    q: "How is this different from a task tracker?",
    a: "Task tools depend on someone typing tasks. Route5 is built for decision capture, ownership, and follow-through when dates slip—so execution state stays honest.",
  },
  {
    q: "We already use AI for meeting notes.",
    a: "Notes answer what was said. Route5 holds who owns what, when it is due, and what changed—then keeps pushing until delivery.",
  },
  {
    q: "Does it work across laptops and phones?",
    a: "Yes. Workspace data is built for continuity across devices so leadership and teams see the same commitments and channels.",
  },
] as const;

export default function HomeExecutiveInteractive() {
  const [activeTrack, setActiveTrack] = useState<(typeof TRACKS)[number]["id"]>("leadership");
  const [openFaq, setOpenFaq] = useState<string>(FAQ[0].q);
  const track = useMemo(
    () => TRACKS.find((item) => item.id === activeTrack) ?? TRACKS[0],
    [activeTrack]
  );
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <motion.article
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12%" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[22px] border border-white/[0.1] bg-[#0c0c0e]/90 p-6 sm:p-8"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">By audience</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TRACKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTrack(item.id)}
              className={`min-h-11 rounded-full px-4 text-[13px] font-medium transition ${
                item.id === activeTrack
                  ? "bg-white text-black"
                  : "border border-white/12 bg-white/[0.03] text-zinc-200 hover:border-white/25"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <h3 className="mt-6 text-[clamp(1.2rem,2.4vw,1.65rem)] font-semibold tracking-[-0.03em] text-white">
          {track.headline}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{track.sub}</p>
        <ul className="mt-5 space-y-2.5 text-[14px] leading-relaxed text-zinc-300">
          {track.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/90" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </motion.article>

      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12%" }}
        transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[22px] border border-white/[0.1] bg-gradient-to-b from-[#141416] to-[#0a0a0c] p-6"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Signal</p>
        <div className="mt-5 space-y-4">
          <div
            className={`rounded-2xl border border-white/[0.06] p-4 ${
              track.stat.tone === "emerald"
                ? "bg-emerald-500/[0.07]"
                : track.stat.tone === "violet"
                  ? "bg-violet-500/[0.08]"
                  : "bg-white/[0.03]"
            }`}
          >
            <p
              className={`text-[28px] font-semibold tabular-nums tracking-tight ${
                track.stat.tone === "emerald"
                  ? "text-emerald-300"
                  : track.stat.tone === "violet"
                    ? "text-violet-200"
                    : "text-zinc-100"
              }`}
            >
              {track.stat.a}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-zinc-400">{track.stat.b}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Commitments with owner</span>
              <span className="tabular-nums text-zinc-300">94%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500/90"
                initial={reduceMotion ? false : { width: 0 }}
                whileInView={reduceMotion ? undefined : { width: "94%" }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      </motion.aside>

      <motion.article
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-8%" }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="rounded-[22px] border border-white/[0.08] bg-[#0a0a0c]/80 p-6 sm:p-8 lg:col-span-2"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Questions</p>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => {
            const open = openFaq === item.q;
            return (
              <div key={item.q} className="rounded-2xl border border-white/[0.08] bg-black/25">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? "" : item.q)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-[14px] font-medium text-zinc-100 sm:px-5"
                >
                  <span>{item.q}</span>
                  <span className="shrink-0 text-zinc-500">{open ? "−" : "+"}</span>
                </button>
                {open ? (
                  <p className="border-t border-white/[0.06] px-4 py-3 text-[13px] leading-relaxed text-zinc-400 sm:px-5">
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </motion.article>
    </div>
  );
}

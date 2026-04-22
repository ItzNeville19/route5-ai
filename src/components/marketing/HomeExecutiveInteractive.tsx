"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const TRACKS = [
  {
    id: "leadership",
    label: "Leadership",
    headline: "See drift before it becomes someone else’s quarterly narrative.",
    sub: "One place for overdue load, owner pressure, and escalation posture—without another status circus.",
    bullets: [
      "Ownership and deadlines stay visible across teams.",
      "Threshold-based escalations when commitments slip.",
      "Digest-ready signals for exec reviews—not vanity charts.",
    ],
    emphasis: {
      line: "Executive altitude",
      sub: "Governance without babysitting spreadsheets.",
      tone: "emerald" as const,
    },
  },
  {
    id: "operations",
    label: "Operations",
    headline: "Turn decisions into owned work when the meeting ends.",
    sub: "Capture stays close to where conversations happen; Route5 keeps structure so nothing evaporates into chat.",
    bullets: [
      "Ingest from meetings, chat, and mail into one execution stream.",
      "Owners stay tied to the originating decision.",
      "Project-scoped context so delivery isn’t guessing.",
    ],
    emphasis: {
      line: "Throughput",
      sub: "Fewer handoffs. Fewer “who owns this?” threads.",
      tone: "zinc" as const,
    },
  },
  {
    id: "teams",
    label: "Teams",
    headline: "Accountability as how you run the week—not a poster.",
    sub: "Roles, invites, and membership mirror how large programs actually coordinate across sites.",
    bullets: [
      "Organization roles with explicit permissions.",
      "Shared projects with clear membership.",
      "Messaging stays tied to work—in the spirit of tools your teams already know.",
    ],
    emphasis: {
      line: "Distributed delivery",
      sub: "Same workspace state whether you’re in HQ or on site.",
      tone: "teal" as const,
    },
  },
] as const;

const FAQ = [
  {
    q: "How is this different from a task tracker?",
    a: "Task tools reward typing tasks. Route5 is built for decisions: who owns it, when it’s due, and what changed when reality hits—so execution stays honest.",
  },
  {
    q: "We already record meetings.",
    a: "Recordings answer what was said. Route5 holds what was committed, who signed up, and what happens when the date moves.",
  },
  {
    q: "Does it work across laptops and phones?",
    a: "Yes. The workspace is built for continuity across devices so leadership and teams see the same commitments.",
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
        className="rounded-sm border border-teal-500/15 bg-[#070b14]/95 p-6 sm:p-8"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-400/80">By audience</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TRACKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTrack(item.id)}
              className={`min-h-11 rounded-sm px-4 text-[13px] font-semibold uppercase tracking-wide transition ${
                item.id === activeTrack
                  ? "bg-teal-500 text-slate-950"
                  : "border border-white/12 bg-white/[0.03] text-zinc-200 hover:border-teal-500/35"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <h3 className="mt-6 text-[clamp(1.15rem,2.4vw,1.55rem)] font-semibold tracking-[-0.025em] text-white">
          {track.headline}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{track.sub}</p>
        <ul className="mt-5 space-y-2.5 text-[14px] leading-relaxed text-slate-400">
          {track.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-400/90" />
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
        className="rounded-sm border border-white/[0.08] bg-gradient-to-b from-[#0c1525] to-[#070b14] p-6"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Focus</p>
        <div className="mt-5 space-y-4">
          <div
            className={`rounded-sm border border-white/[0.06] p-4 ${
              track.emphasis.tone === "emerald"
                ? "bg-emerald-500/[0.07]"
                : track.emphasis.tone === "teal"
                  ? "bg-teal-500/[0.08]"
                  : "bg-white/[0.03]"
            }`}
          >
            <p
              className={`text-[22px] font-semibold leading-tight tracking-tight ${
                track.emphasis.tone === "emerald"
                  ? "text-emerald-200"
                  : track.emphasis.tone === "teal"
                    ? "text-teal-200"
                    : "text-zinc-100"
              }`}
            >
              {track.emphasis.line}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-slate-500">{track.emphasis.sub}</p>
          </div>
          <div className="rounded-sm border border-white/[0.06] bg-black/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Illustrative ownership chain
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
              After sign-in, Route5 shows real ownership coverage for your org. This bar is decorative only.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-500/90"
                initial={reduceMotion ? false : { width: 0 }}
                whileInView={reduceMotion ? undefined : { width: "72%" }}
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
        className="rounded-sm border border-white/[0.08] bg-[#070b14]/85 p-6 sm:p-8 lg:col-span-2"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Questions</p>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => {
            const open = openFaq === item.q;
            return (
              <div key={item.q} className="rounded-sm border border-white/[0.08] bg-black/30">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? "" : item.q)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-[14px] font-medium text-zinc-100 sm:px-5"
                >
                  <span>{item.q}</span>
                  <span className="shrink-0 text-zinc-500">{open ? "−" : "+"}</span>
                </button>
                {open ? (
                  <p className="border-t border-white/[0.06] px-4 py-3 text-[13px] leading-relaxed text-slate-500 sm:px-5">
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

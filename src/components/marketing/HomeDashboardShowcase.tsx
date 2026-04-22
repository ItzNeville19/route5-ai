"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useInView, useReducedMotion, useSpring, useTransform } from "framer-motion";

/** Public marketing-only preview — visual language aligned with signed-in workspace surfaces. */

function SparkArea() {
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const w = 520;
  const h = 160;
  const pad = 12;
  const series = useMemo(
    () =>
      [42, 48, 45, 52, 58, 61, 59, 67, 72, 74, 78, 81, 84, 86, 88, 91, 89, 93, 94, 96].map(
        (v, i, arr) => ({
          x: pad + (i / (arr.length - 1)) * (w - pad * 2),
          y: h - pad - ((v - 40) / 60) * (h - pad * 2),
        })
      ),
    []
  );
  const d = useMemo(() => {
    if (series.length === 0) return "";
    const first = series[0];
    if (!first) return "";
    let path = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    for (let i = 1; i < series.length; i++) {
      const p = series[i];
      if (!p) continue;
      path += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    const last = series[series.length - 1];
    const firstAgain = series[0];
    if (last && firstAgain) {
      path += ` L ${last.x.toFixed(1)} ${(h - pad).toFixed(1)} L ${firstAgain.x.toFixed(1)} ${(h - pad).toFixed(1)} Z`;
    }
    return path;
  }, [series, h, pad]);

  const lineD = useMemo(() => {
    if (series.length === 0) return "";
    const first = series[0];
    if (!first) return "";
    let path = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    for (let i = 1; i < series.length; i++) {
      const p = series[i];
      if (!p) continue;
      path += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    return path;
  }, [series]);

  const pathLength = 800;
  const progress = useSpring(0, { stiffness: 80, damping: 28 });
  useEffect(() => {
    if (reduce) {
      progress.set(1);
      return;
    }
    if (inView) progress.set(1);
  }, [inView, reduce, progress]);

  const strokeDashoffset = useTransform(progress, [0, 1], [pathLength, 0]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Execution closure
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-zinc-200">Rolling 90 days</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500">Marketing preview</p>
          <p className="text-[13px] font-medium text-zinc-400">Illustrative trend</p>
        </div>
      </div>
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        className="h-[140px] w-full sm:h-[160px]"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="home-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(45, 212, 191)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            y1={pad + t * (h - pad * 2)}
            x2={w - pad}
            y2={pad + t * (h - pad * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}
        <motion.path d={d} fill="url(#home-area-fill)" initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ duration: 0.6 }} />
        <motion.path
          d={lineD}
          fill="none"
          stroke="rgb(94, 234, 212)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          style={{ strokeDashoffset }}
        />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-zinc-500">
        <span>Week 1</span>
        <span>Week 12</span>
      </div>
    </div>
  );
}

function StatusMix() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  /** Equal-weight stripes — visual sample only, not live org data. */
  const rows = [
    { label: "On track", pct: 28, color: "bg-blue-500/90" },
    { label: "At risk", pct: 28, color: "bg-amber-500/90" },
    { label: "Overdue", pct: 22, color: "bg-red-500/85" },
    { label: "Done", pct: 22, color: "bg-emerald-500/85" },
  ];
  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e] p-4 sm:p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Commitment mix</p>
      <p className="mt-0.5 text-[13px] font-medium text-zinc-200">Illustrative layout</p>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="flex h-full w-full"
          initial={reduce ? false : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4 }}
        >
          {rows.map((r) => (
            <motion.div
              key={r.label}
              className={`${r.color} h-full`}
              initial={reduce ? false : { width: 0 }}
              animate={inView ? { width: `${r.pct}%` } : {}}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </motion.div>
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${r.color}`} />
              {r.label}
            </span>
            <span className="text-[11px] tabular-nums text-zinc-500">sample</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkloadBars() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  /** Pixel heights — decorative only, not real owner loads. */
  const bars = [48, 82, 64, 96, 40, 72];
  const track = 104;
  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e] p-4 sm:p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Owner load</p>
      <p className="mt-0.5 text-[13px] font-medium text-zinc-200">Illustrative bars by lead</p>
      <div className="mt-5 flex h-[128px] items-end gap-2 sm:gap-3">
        {bars.map((px, i) => (
          <div key={i} className="flex h-[128px] min-h-0 flex-1 flex-col items-center justify-end gap-2">
            <motion.div
              className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-violet-600/30 to-violet-400/80"
              initial={reduce ? false : { height: 0 }}
              animate={inView ? { height: Math.min(px, track) } : {}}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              style={reduce ? { height: Math.min(px, track) } : undefined}
            />
            <span className="text-[9px] tabular-nums text-zinc-600">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CadenceHeat() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const grid = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => 0.15 + ((i * 17) % 73) / 100),
    []
  );
  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e] p-4 sm:p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Decision intake</p>
      <p className="mt-0.5 text-[13px] font-medium text-zinc-200">Sample activity grid (not live)</p>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {grid.map((o, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-md bg-cyan-400/80"
            initial={reduce ? false : { opacity: 0, scale: 0.85 }}
            animate={inView ? { opacity: o, scale: 1 } : {}}
            transition={{ delay: i * 0.012, duration: 0.35 }}
            style={{ opacity: reduce ? o : undefined }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniTable() {
  const rows = [
    { owner: "Product", item: "Ship pricing revision", due: "Apr 22", state: "On track" },
    { owner: "Ops", item: "Vendor review checkpoint", due: "Apr 21", state: "At risk" },
    { owner: "GTM", item: "Enterprise pilot scope", due: "Apr 24", state: "On track" },
  ];
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e] p-0">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Example desk rows</p>
        <p className="mt-0.5 text-[13px] font-medium text-zinc-200">Not your workspace data</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-2 font-medium sm:px-5">Owner</th>
              <th className="px-2 py-2 font-medium">Commitment</th>
              <th className="px-2 py-2 font-medium">Due</th>
              <th className="px-4 py-2 font-medium sm:px-5">State</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((r) => (
              <tr key={r.item} className="border-t border-white/[0.05]">
                <td className="px-4 py-2.5 font-medium text-zinc-200 sm:px-5">{r.owner}</td>
                <td className="px-2 py-2.5 text-zinc-400">{r.item}</td>
                <td className="px-2 py-2.5 tabular-nums text-zinc-500">{r.due}</td>
                <td className="px-4 py-2.5 sm:px-5">
                  <span
                    className={
                      r.state === "At risk"
                        ? "rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200/95"
                        : "rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-200/95"
                    }
                  >
                    {r.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HomeDashboardShowcase() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[28px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(45,212,191,0.12),transparent_55%)]"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[24px] border border-teal-500/15 bg-gradient-to-b from-[#0c1525]/98 to-[#070b14] shadow-[0_28px_90px_-36px_rgba(15,118,110,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold tracking-tight text-white">
              R5
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-zinc-100">Workspace</p>
              <p className="text-[11px] text-zinc-500">Product preview · not connected to your org</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-300/95 sm:inline">
              Synced
            </span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 ring-2 ring-white/10" />
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:gap-4 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {[
                ["Closure signal", "—", "Live after sign-in", "neutral"],
                ["Time to owner", "—", "Per org", "neutral"],
                ["Overdue (org)", "—", "Desk + Leadership", "neutral"],
                ["Escalations", "—", "Rules you configure", "neutral"],
              ].map(([label, v, d, kind]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3 sm:px-4"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
                  <p className="mt-1.5 text-[22px] font-semibold tabular-nums tracking-tight text-white sm:text-2xl">
                    {v}
                  </p>
                  <p
                    className={`mt-0.5 text-[11px] font-medium tabular-nums ${
                      kind === "positive" ? "text-emerald-400/90" : "text-zinc-500"
                    }`}
                  >
                    {d}
                  </p>
                </div>
              ))}
            </div>
            <SparkArea />
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkloadBars />
              <CadenceHeat />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4">
            <StatusMix />
            <MiniTable />
          </div>
        </div>
      </div>
    </div>
  );
}

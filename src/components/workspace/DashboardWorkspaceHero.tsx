"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ChevronRight,
  Search,
} from "lucide-react";
import { getHeroHeadline, getWorkspaceWelcome } from "@/lib/workspace-welcome";
import { useCommandPalette } from "@/components/CommandPalette";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import RelayCommandOrb from "@/components/workspace/RelayCommandOrb";
import DashboardDailyTodos from "@/components/workspace/DashboardDailyTodos";

const ease = [0.22, 1, 0.36, 1] as const;

/** WHOOP-style ring: score 0–100 for arc length; `value` is the number shown in the center. */
const RING_R = 34;
const RING_STROKE = 5;

function WhoopRing({
  label,
  value,
  scorePct,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  scorePct: number;
  accent: string;
  loading: boolean;
}) {
  const r = RING_R;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, scorePct));
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1.5 py-2 sm:px-3">
      <div className="relative h-[5rem] w-[5rem] sm:h-[5.25rem] sm:w-[5.25rem]">
        <svg
          className="h-full w-full -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={loading ? c : offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${accent}44)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {loading ? (
            <span className="h-6 w-8 animate-pulse rounded-md bg-white/10" />
          ) : (
            <span className="text-[1.35rem] font-semibold tabular-nums tracking-tight text-white sm:text-[1.5rem]">
              {value}
            </span>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </p>
    </div>
  );
}

type Readiness = { openai: boolean; linear: boolean; github: boolean };

type Props = {
  displayName: string;
  userId: string | undefined;
  /** Workspace timezone — drives time-of-day hero headline. */
  workspaceTimezone?: string;
  summaryLoading: boolean;
  projectCount: number;
  extractionCount: number;
  liveConnectorCount: number | null;
  readiness: Readiness | null;
  /** When true, hide guided setup in Jump (saves space for returning users). */
  onboardingComplete: boolean;
};

function ringScoreProjects(n: number) {
  if (n <= 0) return 0;
  return Math.min(100, 18 + n * 14);
}
function ringScoreExtractions(n: number) {
  if (n <= 0) return 0;
  return Math.min(100, 12 + n * 6);
}
function ringScoreConnections(n: number | null) {
  if (n == null) return 0;
  return Math.min(100, (n / 3) * 100);
}

export default function DashboardWorkspaceHero({
  displayName,
  userId,
  workspaceTimezone,
  summaryLoading,
  projectCount,
  extractionCount,
  liveConnectorCount,
  readiness,
  onboardingComplete,
}: Props) {
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();
  const customNote = exp.prefs.dashboardCompanyNote?.trim();
  const aiShortcuts = exp.prefs.dashboardAiShortcuts ?? [];
  const welcome = useMemo(
    () => getWorkspaceWelcome(displayName, userId),
    [displayName, userId]
  );

  const [lineFlip, setLineFlip] = useState(0);
  const [hourTick, setHourTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setLineFlip((f) => f + 1), 12000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setHourTick((t) => t + 1), 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const activeLine = lineFlip % 2 === 0 ? welcome.tagline : welcome.altTagline;

  const first = displayName.trim().split(/\s+/)[0] || "there";
  const heroHeadline = useMemo(
    () => getHeroHeadline(first, userId, workspaceTimezone),
    [first, userId, workspaceTimezone, hourTick]
  );
  const dateLine = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  return (
    <motion.div
      className="dashboard-whoop relative overflow-hidden rounded-2xl border border-white/[0.09] shadow-[0_36px_140px_-52px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.06)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-24%,rgba(59,130,246,0.14),transparent_58%),radial-gradient(ellipse_70%_45%_at_100%_100%,rgba(168,85,247,0.1),transparent_52%),linear-gradient(180deg,#060607_0%,#0b0b0e_42%,#080809_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden
      />
      <div className="relative z-[2] px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
        {/* Top bar — HUD density */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
                Overview
              </p>
              <span className="hidden text-zinc-600 sm:inline" aria-hidden>
                ·
              </span>
              <p className="text-[11px] font-medium tabular-nums text-zinc-500">{dateLine}</p>
            </div>
            <h1 className="mt-2 text-[clamp(1.35rem,3.8vw,1.85rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-white">
              {heroHeadline}
            </h1>
            {customNote ? (
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-zinc-300">{customNote}</p>
            ) : (
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeLine}
                  className="mt-3 max-w-lg text-[13px] leading-relaxed text-zinc-400"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeLine}
                </motion.p>
              </AnimatePresence>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col items-center gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-zinc-500 sm:inline-block">
              ⌘K
            </kbd>
            <RelayCommandOrb />
          </div>
        </div>

        {/* Three rings — compact score dials */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.07] overflow-hidden rounded-2xl border border-white/[0.09] bg-[linear-gradient(165deg,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.45)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_48px_-36px_rgba(0,0,0,0.9)]">
          <WhoopRing
            label="Projects"
            value={projectCount}
            scorePct={ringScoreProjects(projectCount)}
            accent="#3b82f6"
            loading={summaryLoading}
          />
          <WhoopRing
            label="Extractions"
            value={extractionCount}
            scorePct={ringScoreExtractions(extractionCount)}
            accent="#a855f7"
            loading={summaryLoading}
          />
          <Link
            href="/workspace/apps"
            className="group flex min-w-0 flex-1 flex-col items-center justify-center border-0 px-1.5 py-2 transition hover:bg-white/[0.03] sm:px-3"
            title="Open app launcher"
          >
            <div className="relative h-[5rem] w-[5rem] sm:h-[5.25rem] sm:w-[5.25rem]">
              <svg
                className="h-full w-full -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={RING_STROKE}
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * RING_R}
                  strokeDashoffset={
                    summaryLoading
                      ? 2 * Math.PI * RING_R
                      : 2 * Math.PI * RING_R -
                        (ringScoreConnections(liveConnectorCount) / 100) * 2 * Math.PI * RING_R
                  }
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                  style={{ filter: "drop-shadow(0 0 6px rgba(34,197,94,0.3))" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {summaryLoading ? (
                  <span className="h-6 w-8 animate-pulse rounded-md bg-white/10" />
                ) : (
                  <span className="text-[1.35rem] font-semibold tabular-nums tracking-tight text-white sm:text-[1.5rem]">
                    {liveConnectorCount ?? "—"}
                  </span>
                )}
              </div>
              <ArrowUpRight className="absolute right-0.5 top-0.5 h-3 w-3 text-zinc-600 opacity-0 transition group-hover:opacity-100" />
            </div>
            <p className="mt-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Connections
            </p>
          </Link>
        </div>

        <DashboardDailyTodos projectCount={projectCount} extractionCount={extractionCount} />

        {/* Jump — no “App Store” label; optional guided setup only if not finished */}
        <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-white/[0.06] pt-4 text-[12px] text-zinc-500">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Jump
          </span>
          {!onboardingComplete ? (
            <>
              <Link
                href="/onboarding?replay=1"
                className="text-zinc-300 transition hover:text-white"
              >
                Guided setup
              </Link>
              <span className="text-zinc-700">·</span>
            </>
          ) : null}
          <Link href="/projects#new-project" className="text-zinc-300 transition hover:text-white">
            New project
          </Link>
          <span className="text-zinc-700">·</span>
          <Link href="/desk" className="text-zinc-300 transition hover:text-white">
            Desk
          </Link>
          <span className="text-zinc-700">·</span>
          <Link href="/marketplace" className="text-zinc-300 transition hover:text-white">
            Marketplace
          </Link>
          {aiShortcuts.map((s) => (
            <span key={s.href + s.label} className="contents">
              <span className="text-zinc-700">·</span>
              <Link href={s.href} className="text-zinc-300 transition hover:text-white">
                {s.label}
              </Link>
            </span>
          ))}
        </div>

        {/* Primary actions */}
        <motion.div
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease }}
        >
          <button
            type="button"
            onClick={() => {
              router.push("/projects#new-project");
              window.setTimeout(() => document.getElementById("new-project-name")?.focus(), 120);
            }}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[13px] font-semibold text-zinc-950 shadow-lg shadow-black/30 transition hover:bg-zinc-100 sm:flex-initial"
          >
            New project
            <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => openPalette()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium text-zinc-200 backdrop-blur-sm transition hover:bg-white/[0.08] sm:flex-initial"
          >
            <Search className="h-4 w-4 text-zinc-500" aria-hidden />
            Search
            <kbd className="ml-0.5 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              ⌘K
            </kbd>
          </button>
          <div className="hidden h-8 w-px bg-white/10 sm:mx-1 sm:block" aria-hidden />
          <div className="flex flex-wrap items-center gap-1 sm:gap-0">
            <Link
              href="/desk"
              className="min-h-[44px] rounded-lg px-3 py-2 text-[13px] font-semibold text-indigo-400 transition hover:text-indigo-300"
            >
              Desk
            </Link>
            <Link
              href="/integrations"
              className="min-h-[44px] rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 transition hover:text-zinc-200"
            >
              Integrations
            </Link>
            <Link
              href="/marketplace"
              className="min-h-[44px] rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 transition hover:text-zinc-200"
            >
              Marketplace
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Command, LayoutList, MessageSquarePlus, Users } from "lucide-react";

const SLIDES = [
  {
    id: "feed",
    title: "Feed — one queue for the org",
    body: "Every commitment rolls up by due date. Filter by owner, search across projects, and expand a row to edit owner, due date, or comments — without leaving the page.",
    icon: LayoutList,
    accent: "from-violet-500/20 to-fuchsia-500/10",
  },
  {
    id: "capture",
    title: "Capture — decisions in, structure out",
    body: "Paste meeting notes or Slack threads. Route5 turns text into owned commitments you can track. Open Capture with ⌘J from anywhere.",
    icon: MessageSquarePlus,
    accent: "from-emerald-500/15 to-cyan-500/10",
  },
  {
    id: "desk",
    title: "Desk — clear the oldest work first",
    body: "Desk surfaces open actions so nothing stalls. Same data as Feed, tuned for triage — use whichever fits how you work.",
    icon: LayoutList,
    accent: "from-amber-500/15 to-orange-500/10",
  },
  {
    id: "team",
    title: "Team — real owners, real profiles",
    body: "See who owns commitments in your workspace and switch Clerk organizations when you use shared billing. Collaboration starts with clear ownership.",
    icon: Users,
    accent: "from-sky-500/15 to-indigo-500/10",
  },
  {
    id: "palette",
    title: "Command palette — every screen, one shortcut",
    body: "Press ⌘K to jump to Desk, Overview, Marketplace, themes, and more. The sidebar stays calm; search finds the rest.",
    icon: Command,
    accent: "from-purple-500/20 to-pink-500/10",
  },
] as const;

/** Interactive first-look tour — no external video; runs entirely in the app. */
export default function OnboardingProductTour() {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const Icon = slide.icon;

  const next = useCallback(() => setI((x) => Math.min(SLIDES.length - 1, x + 1)), []);
  const prev = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  return (
    <div className="overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-primary/40 shadow-[var(--r5-shadow-elevated)]">
      <div
        className={`relative bg-gradient-to-br px-[var(--r5-space-5)] py-[var(--r5-space-5)] sm:px-[var(--r5-space-6)] sm:py-[var(--r5-space-6)] ${slide.accent}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_-10%,rgba(255,255,255,0.12),transparent_55%)]" aria-hidden />
        <div className="relative flex flex-col gap-[var(--r5-space-4)] lg:flex-row lg:items-start lg:justify-between lg:gap-[var(--r5-space-6)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-r5-accent">
              <Icon className="h-6 w-6 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-r5-text-tertiary">
                Interactive tour · {i + 1} / {SLIDES.length}
              </span>
            </div>
            <h2 className="mt-3 text-[length:var(--r5-font-heading)] font-semibold tracking-tight text-r5-text-primary">
              {slide.title}
            </h2>
            <p className="mt-2 max-w-xl text-[length:var(--r5-font-body)] leading-relaxed text-r5-text-secondary">
              {slide.body}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {slide.id === "team" ? (
                <Link
                  href="/workspace/organization"
                  className="inline-flex items-center rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-4 py-2 text-[length:var(--r5-font-body)] font-medium text-r5-surface-primary transition hover:opacity-95"
                >
                  Open Organization
                </Link>
              ) : null}
              <Link
                href="/feed"
                className="inline-flex items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/80 px-4 py-2 text-[length:var(--r5-font-body)] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover"
              >
                Open Feed
              </Link>
            </div>
          </div>

          <MiniChromePreview slideId={slide.id} />
        </div>

        <div className="relative mt-[var(--r5-space-5)] flex flex-wrap items-center justify-between gap-3 border-t border-r5-border-subtle/80 pt-[var(--r5-space-4)]">
          <div className="flex gap-1.5">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setI(idx)}
                className={`h-2 rounded-full transition-[width,background] ${
                  idx === i ? "w-8 bg-r5-accent" : "w-2 bg-r5-border-subtle hover:bg-r5-text-tertiary"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={i === 0}
              className="inline-flex items-center gap-1 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/60 px-3 py-2 text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={i >= SLIDES.length - 1}
              className="inline-flex items-center gap-1 rounded-[var(--r5-radius-pill)] border border-r5-accent/40 bg-r5-accent/15 px-3 py-2 text-[length:var(--r5-font-body)] font-medium text-r5-text-primary transition hover:bg-r5-accent/25 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChromePreview({ slideId }: { slideId: string }) {
  return (
    <div
      className="relative w-full shrink-0 overflow-hidden rounded-[var(--r5-radius-md)] border border-r5-border-subtle/90 bg-r5-surface-secondary/50 shadow-inner lg:w-[min(100%,280px)]"
      aria-hidden
    >
      <div className="flex items-center gap-1 border-b border-r5-border-subtle/60 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-400/80" />
        <span className="h-2 w-2 rounded-full bg-amber-400/80" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2 h-2 flex-1 rounded bg-r5-border-subtle/50" />
      </div>
      <div className="space-y-2 p-3">
        {slideId === "feed" && (
          <>
            <div className="flex gap-2">
              <span className="h-6 w-14 rounded bg-r5-accent/25" />
              <span className="h-6 w-10 rounded bg-r5-border-subtle/40" />
              <span className="h-6 w-10 rounded bg-r5-border-subtle/40" />
            </div>
            {[1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-2 rounded border border-r5-border-subtle/40 bg-r5-surface-primary/30 p-2">
                <span className="h-8 w-8 rounded-full bg-r5-accent/20" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-2 w-[72%] rounded bg-r5-text-secondary/30" />
                  <div className="h-2 w-[48%] rounded bg-r5-border-subtle/50" />
                </div>
              </div>
            ))}
          </>
        )}
        {slideId === "capture" && (
          <div className="space-y-2 rounded border border-dashed border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="h-2 w-full rounded bg-r5-text-secondary/25" />
            <div className="h-2 w-[84%] rounded bg-r5-text-secondary/20" />
            <div className="h-2 w-[66%] rounded bg-r5-text-secondary/15" />
            <div className="mt-2 flex gap-2">
              <span className="h-6 flex-1 rounded bg-emerald-500/25" />
              <span className="h-6 w-16 rounded bg-r5-accent/30" />
            </div>
          </div>
        )}
        {slideId === "desk" && (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <div key={k} className="flex items-center justify-between rounded bg-amber-500/10 px-2 py-2">
                <span className="h-2 w-24 rounded bg-r5-text-secondary/30" />
                <span className="h-5 w-12 rounded bg-amber-500/25" />
              </div>
            ))}
          </div>
        )}
        {slideId === "team" && (
          <div className="space-y-2">
            {[1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full bg-sky-500/25" />
                <div className="h-2 flex-1 rounded bg-r5-border-subtle/50" />
              </div>
            ))}
          </div>
        )}
        {slideId === "palette" && (
          <div className="rounded border border-r5-border-subtle/60 bg-r5-surface-primary/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] text-r5-text-tertiary">
              <Command className="h-3.5 w-3.5" />
              <span>Search Route5…</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded bg-r5-accent/20" />
              <div className="h-2 w-[80%] rounded bg-r5-border-subtle/40" />
              <div className="h-2 w-[60%] rounded bg-r5-border-subtle/35" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

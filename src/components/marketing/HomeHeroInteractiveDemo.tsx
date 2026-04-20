"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type TabId = "capture" | "feed" | "leadership";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "capture", label: "Capture" },
  { id: "feed", label: "Desk" },
  { id: "leadership", label: "Leadership" },
];

export default function HomeHeroInteractiveDemo() {
  const [active, setActive] = useState<TabId>("feed");

  const content = useMemo(() => {
    if (active === "capture") {
      return {
        title: "Paste decisions. Confirm ownership fast.",
        body: "Turn messy notes, threads, and emails into structured commitments with owner, date, and priority prefilled.",
        ctaHref: "/desk",
        ctaLabel: "Open Capture",
        bullets: ["Owner + deadline prefilled", "One-click commit to feed", "Email + in-app ownership notifications"],
      };
    }
    if (active === "leadership") {
      return {
        title: "See execution health in seconds.",
        body: "Know who is on track, at risk, and overdue. No status-chasing meetings required.",
        ctaHref: "/overview",
        ctaLabel: "Open Leadership",
        bullets: ["Execution health score", "Owner reliability view", "Escalation-ready overdue list"],
      };
    }
    return {
      title: "Run your day from one feed.",
      body: "Process commitments by priority and due date, update status, and keep everyone accountable in real time.",
      ctaHref: "/desk",
      ctaLabel: "Open Desk",
      bullets: ["Overdue, Today, This Week grouping", "Inline updates without context switching", "Realtime sync across the team"],
    };
  }, [active]);

  return (
    <div className="workspace-preview-panel mx-auto mt-10 w-full max-w-[980px] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Interactive product preview</p>
        <span className="rounded-full border border-violet-400/30 bg-violet-500/12 px-2.5 py-1 text-[11px] font-medium text-violet-200">
          Live app surfaces
        </span>
      </div>

      <div className="rounded-2xl border border-white/12 bg-black/25 p-3">
        <div className="mb-3 flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                active === tab.id
                  ? "border-violet-300/60 bg-violet-500/20 text-violet-100"
                  : "border-white/12 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-left">
            <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-white">{content.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-300">{content.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {content.bullets.map((line) => (
                <span key={line} className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-zinc-200">
                  {line}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <Link href={content.ctaHref} className="inline-flex rounded-full border border-violet-400/35 bg-violet-500/15 px-4 py-2 text-[13px] font-semibold text-violet-100 transition hover:bg-violet-500/25">
                {content.ctaLabel}
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">What users get</p>
            <div className="mt-3 space-y-2.5">
              {[
                "Clear ownership on every commitment",
                "Automatic follow-up when work slips",
                "Leadership visibility without manual reporting",
              ].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

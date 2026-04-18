"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { BrandSquircle } from "@/components/marketplace/brand-icons";
import { ALL_MARKETPLACE_APPS } from "@/lib/marketplace-catalog";

/**
 * Bottom-of-Overview marketplace strip — scattered tiles (no marquee), dense preview.
 */
const SPOTS: { top: string; left?: string; right?: string; size: number; rotate: number }[] = [
  { top: "4%", left: "1%", size: 44, rotate: -9 },
  { top: "2%", right: "4%", size: 48, rotate: 11 },
  { top: "20%", left: "10%", size: 38, rotate: 5 },
  { top: "12%", right: "14%", size: 40, rotate: -6 },
  { top: "38%", left: "0%", size: 36, rotate: 7 },
  { top: "32%", right: "5%", size: 42, rotate: -4 },
  { top: "50%", left: "16%", size: 34, rotate: -11 },
  { top: "46%", right: "18%", size: 38, rotate: 8 },
  { top: "8%", left: "38%", size: 34, rotate: 6 },
  { top: "26%", right: "36%", size: 32, rotate: -5 },
  { top: "54%", left: "34%", size: 32, rotate: 9 },
  { top: "16%", left: "52%", size: 36, rotate: -3 },
  { top: "3%", right: "32%", size: 34, rotate: 4 },
  { top: "42%", left: "46%", size: 30, rotate: -8 },
  { top: "58%", right: "42%", size: 28, rotate: 10 },
  { top: "24%", left: "24%", size: 30, rotate: -7 },
  { top: "62%", left: "8%", size: 28, rotate: 5 },
  { top: "6%", right: "48%", size: 32, rotate: -4 },
  { top: "34%", left: "58%", size: 30, rotate: 7 },
  { top: "48%", right: "28%", size: 34, rotate: -9 },
  { top: "14%", left: "68%", size: 28, rotate: 4 },
  { top: "52%", right: "8%", size: 30, rotate: -6 },
];

function teaserApps() {
  const pool = ALL_MARKETPLACE_APPS.filter((a) => a.kind !== "installable");
  const order = (k: (typeof pool)[0]["kind"]) =>
    k === "native" ? 0 : k === "stack" ? 1 : 2;
  return [...pool]
    .sort((a, b) => order(a.kind) - order(b.kind) || a.name.localeCompare(b.name))
    .slice(0, SPOTS.length);
}

export default function DashboardMarketplaceTeaser() {
  const apps = teaserApps();
  const n = Math.min(apps.length, SPOTS.length);

  return (
    <section
      className="mt-10 overflow-hidden rounded-[28px] border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label="Marketplace preview"
    >
      <div className="relative border-b border-[var(--workspace-border)]/60">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--workspace-accent)]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-violet-500/8 blur-3xl"
          aria-hidden
        />

        <div
          className="relative mx-auto min-h-[min(260px,42vw)] max-w-4xl px-3 pt-3 sm:min-h-[280px] sm:px-5 sm:pt-4"
          role="presentation"
        >
          {apps.slice(0, n).map((app, i) => {
            const spot = SPOTS[i]!;
            const pos: CSSProperties = {
              top: spot.top,
              ...(spot.left != null ? { left: spot.left } : {}),
              ...(spot.right != null ? { right: spot.right } : {}),
              transform: `rotate(${spot.rotate}deg)`,
            };
            const s = spot.size;
            return (
              <div
                key={`${app.id}-${i}`}
                className="pointer-events-none absolute z-[1]"
                style={pos}
                title={app.name}
              >
                <span
                  className="flex rounded-[22%] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
                  style={{ width: s, height: s }}
                >
                  <BrandSquircle id={app.brandId} sizeClass="h-full w-full min-h-0 min-w-0" />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-[2] bg-[var(--workspace-canvas)]/80 px-5 py-5 text-center sm:px-8 sm:py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
          Marketplace
        </p>
        <p className="mx-auto mt-2 max-w-md text-[14px] font-medium leading-snug text-[var(--workspace-fg)]">
          Connectors and stack (optional). Core execution stays on Desk and Overview — Marketplace is for extras and provider defaults.
        </p>
        <Link
          href="/marketplace"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--workspace-fg)] px-5 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95"
        >
          <LayoutGrid className="h-4 w-4 opacity-90" aria-hidden />
          Browse marketplace
          <ArrowUpRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
        </Link>
        <p className="mx-auto mt-3 max-w-sm text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Icons are decorative — one place to browse everything.
        </p>
      </div>
    </section>
  );
}

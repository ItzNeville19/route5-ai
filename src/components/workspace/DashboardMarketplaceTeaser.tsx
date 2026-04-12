"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { BrandSquircle } from "@/components/marketplace/brand-icons";
import { marketplaceOverviewShowcaseApps } from "@/lib/marketplace-catalog";

/**
 * Bottom-of-Overview marketplace strip — scattered tiles (no marquee), one icon per vendor.
 */
const SPOTS: { top: string; left?: string; right?: string; size: number; rotate: number }[] = [
  { top: "6%", left: "2%", size: 46, rotate: -9 },
  { top: "2%", right: "5%", size: 50, rotate: 11 },
  { top: "22%", left: "12%", size: 40, rotate: 5 },
  { top: "14%", right: "16%", size: 42, rotate: -6 },
  { top: "40%", left: "0%", size: 38, rotate: 7 },
  { top: "34%", right: "6%", size: 44, rotate: -4 },
  { top: "52%", left: "18%", size: 36, rotate: -11 },
  { top: "48%", right: "20%", size: 40, rotate: 8 },
  { top: "10%", left: "40%", size: 36, rotate: 6 },
  { top: "28%", right: "38%", size: 34, rotate: -5 },
  { top: "56%", left: "36%", size: 34, rotate: 9 },
  { top: "18%", left: "54%", size: 38, rotate: -3 },
  { top: "4%", right: "34%", size: 36, rotate: 4 },
  { top: "44%", left: "48%", size: 32, rotate: -8 },
];

export default function DashboardMarketplaceTeaser() {
  const apps = marketplaceOverviewShowcaseApps();
  const n = Math.min(apps.length, SPOTS.length);

  return (
    <section
      className="mt-10 overflow-hidden rounded-[28px] border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label="Marketplace"
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

        <div className="relative mx-auto min-h-[min(200px,38vw)] max-w-4xl px-3 pt-3 sm:min-h-[220px] sm:px-5 sm:pt-4">
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
              <Link
                key={app.id}
                href={`/marketplace/${app.id}`}
                title={`${app.name} — marketplace`}
                className="absolute z-[1] transition will-change-transform hover:z-[5] hover:scale-[1.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-accent)] motion-reduce:transform-none motion-reduce:hover:scale-100"
                style={pos}
              >
                <span
                  className="flex rounded-[22%] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
                  style={{ width: s, height: s }}
                >
                  <BrandSquircle id={app.brandId} sizeClass="h-full w-full min-h-0 min-w-0" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="relative z-[2] bg-[var(--workspace-canvas)]/80 px-5 py-5 text-center sm:px-8 sm:py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
          Marketplace
        </p>
        <p className="mx-auto mt-2 max-w-md text-[14px] font-medium leading-snug text-[var(--workspace-fg)]">
          Pick up connectors, engines, and workspace apps when you need them.
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
          Same catalog as Desk &amp; Library — subtle by design.
        </p>
      </div>
    </section>
  );
}

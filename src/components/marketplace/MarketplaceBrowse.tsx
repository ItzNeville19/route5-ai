"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Search,
  Star,
} from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { BrandSquircle } from "@/components/marketplace/brand-icons";
import {
  ALL_MARKETPLACE_APPS,
  MARKETPLACE_CATEGORIES,
  marketplaceNativeBrowseOrdered,
  marketplaceRoadmapBrowseOrdered,
  marketplaceStackBrowseOrdered,
  type MarketplaceApp,
  type MarketplaceCategoryId,
  filterMarketplaceApps,
} from "@/lib/marketplace-catalog";
import { PRODUCT_HONEST } from "@/lib/product-truth";

const appleEase = [0.22, 1, 0.36, 1] as const;

type Health = {
  ok?: boolean;
  openaiConfigured?: boolean;
  linearConfigured?: boolean;
  githubConfigured?: boolean;
  supabaseConfigured?: boolean;
  storageBackend?: "supabase" | "sqlite";
  storageReady?: boolean;
  extractionMode?: "ai" | "offline";
};

function AppListRow({
  app,
  index,
}: {
  app: MarketplaceApp;
  index: number;
}) {
  const exp = useWorkspaceExperience();
  const fav = exp.isMarketplaceFavorite(app.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.35, ease: appleEase }}
      className="group flex min-h-[56px] items-stretch"
    >
      <button
        type="button"
        onClick={() => {
          exp.toggleMarketplaceFavorite(app.id);
          exp.pushToast(fav ? "Removed from favorites" : "Saved to favorites", "success");
        }}
        className={`flex w-11 shrink-0 items-center justify-center border-b border-[var(--ios-separator)] transition active:bg-black/[0.04] ${
          fav ? "text-amber-500" : "text-[var(--ios-separator)] opacity-60 hover:opacity-100"
        }`}
        aria-label={fav ? "Remove favorite" : "Add favorite"}
      >
        <Star className={`h-4 w-4 ${fav ? "fill-current" : ""}`} strokeWidth={2} />
      </button>
      <Link
        href={`/marketplace/${app.id}`}
        className="ios-press flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 py-3 transition-colors active:bg-black/[0.04] sm:px-4"
      >
        <BrandSquircle id={app.brandId} sizeClass="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-snug text-[var(--ios-label)]">{app.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--ios-secondary)]">
            {app.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {app.kind === "roadmap" ? (
            <span className="rounded-md bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ios-secondary)]">
              Roadmap
            </span>
          ) : null}
          <ChevronRight className="h-[15px] w-[15px] text-[var(--ios-separator)] opacity-70" aria-hidden />
        </div>
      </Link>
    </motion.div>
  );
}

export default function MarketplaceBrowse() {
  const [health, setHealth] = useState<Health | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [category, setCategory] = useState<MarketplaceCategoryId>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [hRes, pRes] = await Promise.all([
        fetch("/api/health", { credentials: "same-origin" }),
        fetch("/api/projects", { credentials: "same-origin" }),
      ]);
      if (hRes.ok) setHealth((await hRes.json()) as Health);
      if (pRes.ok) {
        const d = (await pRes.json()) as { projects?: { id: string }[] };
        setProjectCount(d.projects?.length ?? 0);
      }
    } catch {
      setHealth({});
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => filterMarketplaceApps(ALL_MARKETPLACE_APPS, category, query),
    [category, query]
  );

  const showGrouped = category === "all" && !query.trim();

  const featured = ALL_MARKETPLACE_APPS.filter((a) =>
    ["linear", "github-issues", "virtual-desk", "figma", "google-workspace", "intelligence"].includes(
      a.id
    )
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: appleEase }}
      className="pb-28"
    >
      <header className="mb-6">
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ios-label)]">
          Marketplace
        </h1>
        <p className="mt-1.5 max-w-md text-[13px] text-[var(--ios-secondary)]">
          Built-in and stack routes open in-app. Roadmap items are labeled — no hidden placeholders.
        </p>
      </header>

      <div className="mb-6 flex items-center gap-2 rounded-[10px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2.5 shadow-sm">
        <Search className="h-[18px] w-[18px] shrink-0 text-[var(--ios-secondary)]" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="min-w-0 flex-1 border-0 bg-transparent text-[17px] text-[var(--ios-label)] outline-none placeholder:text-[var(--ios-secondary)]"
          aria-label="Search marketplace"
        />
      </div>

      <section className="mb-8" aria-label="Featured">
        <Link
          href="/desk"
          className="ios-press relative block overflow-hidden rounded-[14px] bg-gradient-to-br from-[#2c2c2e] via-[#1c1c1e] to-[#0f0f10] p-6 text-white shadow-xl shadow-black/20 sm:p-8"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--workspace-accent)]/25 blur-3xl"
            aria-hidden
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Featured
          </p>
          <p className="mt-2 text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
            Desk
          </p>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/75">
            Capture, templates, extractions, and integrations — one calm surface.
          </p>
          <span className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-white">
            Open
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </section>

      <section className="mb-8" aria-labelledby="today-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="today-heading"
            className="text-[22px] font-bold tracking-tight text-[var(--ios-label)]"
          >
            Today
          </h2>
          <p className="text-[13px] text-[var(--ios-secondary)]">
            {projectCount !== null ? `${projectCount} project${projectCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] sm:-mx-0 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {featured.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: appleEase }}
              className="min-w-[200px] max-w-[240px] shrink-0"
            >
              <Link
                href={`/marketplace/${app.id}`}
                className="ios-press flex h-full flex-col rounded-[14px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-4 shadow-sm"
              >
                <BrandSquircle id={app.brandId} sizeClass="h-14 w-14" />
                <p className="mt-3 text-[15px] font-semibold text-[var(--ios-label)]">{app.name}</p>
                <p className="mt-1 line-clamp-2 flex-1 text-[12px] leading-snug text-[var(--ios-secondary)]">
                  {app.subtitle}
                </p>
                <p className="mt-3 text-[13px] font-semibold text-[var(--workspace-accent)]">View</p>
              </Link>
            </motion.div>
          ))}
          <Link
            href="/support"
            className="ios-press min-w-[200px] shrink-0 rounded-[14px] border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-canvas)] p-4"
          >
            <p className="text-[15px] font-semibold text-[var(--ios-label)]">Need something else?</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--ios-secondary)]">
              Tell us what to connect next.
            </p>
            <p className="mt-3 text-[13px] font-semibold text-[var(--workspace-accent)]">Contact</p>
          </Link>
        </div>
      </section>

      <section
        className="mb-8 overflow-hidden rounded-[12px] border border-[var(--workspace-border)] bg-[var(--ios-group-bg)] px-4 py-3 shadow-sm"
        aria-label="Live stack"
      >
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--ios-secondary)]">
          <Activity className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
          <span className="font-medium text-[var(--ios-label)]">Live stack</span>
          <span className="text-[var(--ios-separator)]">·</span>
          <span>
            {health === null
              ? "Checking…"
              : health.storageBackend === "supabase"
                ? "Cloud database"
                : "Embedded database"}
          </span>
          <span className="text-[var(--ios-separator)]">·</span>
          <span>
            {health?.extractionMode === "ai"
              ? "LLM extraction"
              : health?.extractionMode === "offline"
                ? "Heuristic extraction"
                : "—"}
          </span>
          <span className="text-[var(--ios-separator)]">·</span>
          <span>
            {health?.linearConfigured ? "Linear live" : "Linear ready"}
          </span>
          <span className="text-[var(--ios-separator)]">·</span>
          <span>
            {health?.githubConfigured ? "GitHub live" : "GitHub ready"}
          </span>
          <Link
            href="/integrations"
            className="ml-auto font-medium text-[var(--workspace-accent)] hover:underline"
          >
            Open
          </Link>
        </div>
      </section>

      <section aria-labelledby="browse-heading">
        <h2
          id="browse-heading"
          className="text-[22px] font-bold tracking-tight text-[var(--ios-label)]"
        >
          Browse
        </h2>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Category"
        >
          {MARKETPLACE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition-transform active:scale-[0.97] ${
                category === c.id
                  ? "bg-[var(--ios-label)] text-white"
                  : "bg-[var(--workspace-surface)] text-[var(--ios-label)] ring-1 ring-[var(--workspace-border)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-[var(--ios-secondary)]">
          {showGrouped
            ? `${marketplaceNativeBrowseOrdered().length + marketplaceStackBrowseOrdered().length + marketplaceRoadmapBrowseOrdered().length} listings`
            : `${filtered.length} app${filtered.length === 1 ? "" : "s"}${query ? ` matching “${query}”` : ""}`}
        </p>

        {showGrouped ? (
          <div className="mt-6 space-y-10">
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary)]">
                Route5
              </h3>
              <p className="mt-1 text-[13px] text-[var(--ios-secondary)]">
                Surfaces that ship with this product — each opens its own detail page.
              </p>
              <div className="mt-3 divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[12px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] shadow-sm">
                {marketplaceNativeBrowseOrdered().map((app, index) => (
                  <AppListRow key={app.id} app={app} index={index} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary)]">
                Your infrastructure
              </h3>
              <p className="mt-1 text-[13px] text-[var(--ios-secondary)]">
                Live status and vendor consoles — not third-party “apps” in the same sense.
              </p>
              <div className="mt-3 divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[12px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] shadow-sm">
                {marketplaceStackBrowseOrdered().map((app, index) => (
                  <AppListRow key={app.id} app={app} index={index} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary)]">
                Connectors (roadmap)
              </h3>
              <p className="mt-1 text-[12px] text-[var(--ios-secondary)]">Planned — not installed.</p>
              <div className="mt-3 divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[12px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] shadow-sm">
                {marketplaceRoadmapBrowseOrdered().map((app, index) => (
                  <AppListRow key={app.id} app={app} index={index} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[12px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] shadow-sm">
              {filtered.map((app, index) => (
                <AppListRow key={app.id} app={app} index={index} />
              ))}
            </div>
            {filtered.length === 0 ? (
              <p className="mt-8 text-center text-[15px] text-[var(--ios-secondary)]">
                No matches. Try another search or category.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="mt-12 overflow-hidden rounded-[14px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start gap-3">
          <Star className="h-7 w-7 fill-amber-400 text-amber-400" aria-hidden />
          <div>
            <p className="text-[15px] font-semibold text-[var(--ios-label)]">Scope</p>
            <p className="mt-1 max-w-xl text-[13px] text-[var(--ios-secondary)]">{PRODUCT_HONEST.oneLine}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/account/plans"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--workspace-accent)] px-5 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            Plans
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-5 py-2.5 text-[14px] font-semibold text-[var(--ios-label)] transition-transform active:scale-[0.98]"
          >
            Support
          </Link>
        </div>
      </section>
    </motion.div>
  );
}

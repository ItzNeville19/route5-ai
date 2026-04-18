"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Download,
  Cpu,
  Search,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { BrandSquircle } from "@/components/marketplace/brand-icons";
import {
  ALL_MARKETPLACE_APPS,
  MARKETPLACE_CATEGORIES,
  marketplaceNativeBrowseOrdered,
  marketplaceRoadmapBrowseOrdered,
  marketplaceStackBrowseOrdered,
  installableBySection,
  type MarketplaceApp,
  type MarketplaceCategoryId,
  filterMarketplaceApps,
} from "@/lib/marketplace-catalog";
import { featuredMarketplaceAppIdsForUtcDay } from "@/lib/marketplace-featured";
import { marketplaceAfterEnableHref } from "@/lib/marketplace-links";
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

/* ── Install button per tile ── */

function InstallButton({ app }: { app: MarketplaceApp }) {
  const router = useRouter();
  const exp = useWorkspaceExperience();
  const installed = exp.isMarketplaceInstalled(app.id);
  const [busy, setBusy] = useState(false);
  const [showUninstall, setShowUninstall] = useState(false);

  if (installed) {
    return (
      <div className="relative flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowUninstall((v) => !v);
          }}
          className="inline-flex h-[30px] items-center gap-1 rounded-full bg-neutral-100/80 px-3 text-[12px] font-semibold text-neutral-600 transition hover:bg-neutral-200 dark:bg-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/[0.12]"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" aria-hidden />
          Enabled
        </button>
        <AnimatePresence>
          {showUninstall && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -4 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                exp.uninstallMarketplaceApp(app.id);
                exp.pushToast(`${app.name} disabled — related defaults reset when they were only used for this listing.`, "info");
                setShowUninstall(false);
              }}
              className="inline-flex h-[30px] items-center gap-1 rounded-full bg-red-50 px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
              Remove
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        setTimeout(() => {
          exp.installMarketplaceApp(app.id);
          exp.pushToast(
            `${app.name} enabled — opening Settings so you can confirm pass / LLM defaults.`,
            "success"
          );
          setBusy(false);
          router.push(marketplaceAfterEnableHref(app));
        }, 220);
      }}
      className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full bg-[#0071e3] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#0077ED] active:scale-[0.97] disabled:opacity-70 dark:bg-[var(--workspace-accent)]"
    >
      {busy ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden />
      )}
      {busy ? "Enabling…" : "Enable"}
    </button>
  );
}

/* ── App row ── */

function AppStoreRow({
  app,
  index,
}: {
  app: MarketplaceApp;
  index: number;
}) {
  const { summary } = useWorkspaceData();
  const exp = useWorkspaceExperience();
  const fav = exp.isMarketplaceFavorite(app.id);
  const isInstallable = app.kind === "installable";
  const kindBadge =
    app.kind === "roadmap"
      ? "Roadmap"
      : app.kind === "installable"
        ? app.manageUrl
          ? "Cloud"
          : "Local"
        : null;

  const configuredLive =
    (app.id === "linear" && summary.readiness?.linear) ||
    (app.id === "github-issues" && summary.readiness?.github) ||
    (app.id === "openai" && summary.readiness?.openai) ||
    (app.id === "figma" && summary.readiness?.figma);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.3), duration: 0.3, ease: appleEase }}
      className="group"
    >
      <Link
        href={`/marketplace/${app.id}`}
        className="ios-press flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] dark:hover:bg-white/[0.03] sm:gap-4 sm:px-5"
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            exp.toggleMarketplaceFavorite(app.id);
          }}
          className={`hidden shrink-0 sm:flex ${
            fav ? "text-amber-500" : "text-neutral-300 opacity-40 hover:opacity-80 dark:text-neutral-600"
          }`}
          aria-label={fav ? "Remove favorite" : "Add favorite"}
        >
          <Star className={`h-4 w-4 ${fav ? "fill-current" : ""}`} strokeWidth={2} />
        </button>

        <BrandSquircle id={app.brandId} sizeClass="h-12 w-12" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-neutral-900 dark:text-[var(--ios-label)]">
              {app.name}
            </p>
            {configuredLive ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            ) : null}
            {kindBadge && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  kindBadge === "Cloud"
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                    : kindBadge === "Local"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-400"
                }`}
              >
                {kindBadge === "Cloud" ? <Cloud className="h-2.5 w-2.5" /> : kindBadge === "Local" ? <Cpu className="h-2.5 w-2.5" /> : null}
                {kindBadge}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-neutral-500 dark:text-[var(--ios-secondary)]">
            {app.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isInstallable ? (
            <InstallButton app={app} />
          ) : (
            <ChevronRight className="h-[15px] w-[15px] text-neutral-300 dark:text-[var(--ios-separator)]" aria-hidden />
          )}
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Horizontal featured card ── */

function FeaturedCard({ app }: { app: MarketplaceApp }) {
  return (
    <motion.div
      className="shrink-0"
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
    <Link
      href={`/marketplace/${app.id}`}
      className="ios-press route5-tilt-hover flex min-w-[220px] max-w-[260px] shrink-0 flex-col rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_12px_36px_-10px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-[var(--workspace-surface)]"
    >
      <BrandSquircle id={app.brandId} sizeClass="h-14 w-14" />
      <p className="mt-3 text-[15px] font-semibold text-neutral-900 dark:text-[var(--ios-label)]">
        {app.name}
      </p>
      <p className="mt-1 flex-1 line-clamp-2 text-[12px] leading-snug text-neutral-500 dark:text-[var(--ios-secondary)]">
        {app.subtitle}
      </p>
      <p className="mt-3 text-[13px] font-semibold text-[#0071e3] dark:text-[var(--workspace-accent)]">
        View
      </p>
    </Link>
    </motion.div>
  );
}

/* ── Section card wrapper ── */

function SectionCard({
  children,
  title,
  count,
}: {
  children: React.ReactNode;
  title?: string;
  count?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[var(--workspace-surface)]">
      {title && (
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 dark:border-white/[0.06]">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-neutral-400 dark:text-neutral-500">
            {title}
          </h3>
          {count != null && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-400">
              {count}
            </span>
          )}
        </div>
      )}
      <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
        {children}
      </div>
    </div>
  );
}

/* ── Main browse ── */

export default function MarketplaceBrowse() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipUrlToState = useRef(false);
  const { summary } = useWorkspaceData();
  const [health, setHealth] = useState<Health | null>(null);
  const [category, setCategory] = useState<MarketplaceCategoryId>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const hRes = await fetch("/api/health", { credentials: "same-origin" });
      if (hRes.ok) setHealth((await hRes.json()) as Health);
    } catch {
      setHealth({});
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (skipUrlToState.current) {
      skipUrlToState.current = false;
      return;
    }
    const q = searchParams.get("q") ?? "";
    setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = query.trim();
      const params = new URLSearchParams(searchParams.toString());
      const cur = params.get("q") ?? "";
      if (cur === next) return;
      if (next) params.set("q", next);
      else params.delete("q");
      skipUrlToState.current = true;
      const s = params.toString();
      router.replace(s ? `/marketplace?${s}` : "/marketplace", { scroll: false });
    }, 380);
    return () => window.clearTimeout(t);
  }, [query, router, searchParams]);

  const filtered = useMemo(
    () => filterMarketplaceApps(ALL_MARKETPLACE_APPS, category, query),
    [category, query]
  );

  const showGrouped = category === "all" && !query.trim();

  const featured = useMemo(() => {
    const ids = featuredMarketplaceAppIdsForUtcDay();
    return ids
      .map((id) => ALL_MARKETPLACE_APPS.find((a) => a.id === id))
      .filter((a): a is MarketplaceApp => Boolean(a));
  }, []);

  const installableSections = useMemo(() => installableBySection(), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: appleEase }}
      className="pb-28"
    >
      {/* ── Header ── */}
      <header className="mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[36px] font-bold leading-[1.08] tracking-[-0.025em] text-neutral-900 dark:text-[var(--ios-label)] sm:text-[42px]">
              Marketplace
            </h1>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-neutral-500 dark:text-[var(--ios-secondary)]">
              Optional engines and provider shortcuts. Enable saves your choice in Settings (pass / LLM defaults) and opens the right section — roadmap entries stay browse-only until shipped.
            </p>
          </div>
          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
            <Link
              href="/privacy#security"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-neutral-300"
              title="Opens the Security section of our public privacy policy"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              Security &amp; privacy
            </Link>
            <Link
              href="/docs/privacy"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-neutral-300"
              title="Workspace privacy summary inside the app"
            >
              Workspace privacy
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
          <Link
            href="/privacy#security"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-neutral-700 shadow-sm dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-neutral-300"
            title="Security practices (public policy)"
          >
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Security &amp; privacy
          </Link>
          <Link
            href="/docs/privacy"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-neutral-700 shadow-sm dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-neutral-300"
          >
            Workspace privacy
          </Link>
        </div>
      </header>

      {/* ── Search: filters catalog below; URL ?q= syncs for sharing ── */}
      <form
        role="search"
        className="mb-6 flex flex-col gap-2 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 shadow-sm dark:border-white/[0.08] dark:bg-[var(--workspace-surface)]"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex items-center gap-2.5">
          <Search className="h-[18px] w-[18px] shrink-0 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter listings by name or description…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-[var(--ios-label)] dark:placeholder:text-[var(--ios-secondary)]"
            aria-label="Filter marketplace listings"
            autoComplete="off"
          />
        </div>
        <p className="pl-[26px] text-[11px] leading-snug text-neutral-400 dark:text-[var(--ios-secondary)]">
          Matches app names and subtitles in real time. Add{" "}
          <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-[10px] dark:border-white/10 dark:bg-white/5">
            ?q=
          </kbd>{" "}
          to the URL to share a filtered view.
        </p>
      </form>

      {/* ── Featured hero ── */}
      <section className="mb-8" aria-label="Featured">
        <Link
          href="/docs/product"
          className="ios-press relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d1d1f] via-[#2c2c2e] to-[#1d1d1f] p-7 text-white shadow-xl shadow-black/20 sm:p-8"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-pink-500/20 to-orange-500/10 blur-2xl"
            aria-hidden
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Product scope
          </p>
          <p className="mt-3 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">
            Live today vs planned next
          </p>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/70">
            Core product is Desk and Overview — structured runs and completion from your data. Listings below include optional connectors and roadmap ideas; live behavior depends on your setup.
          </p>
          <span className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-white">
            Read product scope
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </section>

      {/* ── Today strip ── */}
      <section className="mb-8" aria-labelledby="today-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="today-heading"
            className="text-[22px] font-bold tracking-tight text-neutral-900 dark:text-[var(--ios-label)]"
          >
            Recommended
          </h2>
          <p className="text-[13px] text-neutral-500 dark:text-[var(--ios-secondary)]">
            {`${summary.projectCount} project${summary.projectCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] sm:-mx-0 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {featured.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: appleEase }}
            >
              <FeaturedCard app={app} />
            </motion.div>
          ))}
          <Link
            href="/support"
            className="ios-press flex min-w-[220px] shrink-0 flex-col rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-white/[0.1] dark:bg-white/[0.02]"
          >
            <p className="text-[15px] font-semibold text-neutral-700 dark:text-[var(--ios-label)]">
              Need something else?
            </p>
            <p className="mt-1 flex-1 text-[12px] leading-relaxed text-neutral-500 dark:text-[var(--ios-secondary)]">
              Tell us which live integration or provider path you actually need next.
            </p>
            <p className="mt-3 text-[13px] font-semibold text-[#0071e3] dark:text-[var(--workspace-accent)]">
              Contact
            </p>
          </Link>
        </div>
      </section>

      {/* ── Live stack banner ── */}
      <section
        className="mb-8 rounded-[24px] border border-neutral-200/70 bg-white px-5 py-3.5 shadow-sm dark:border-white/[0.08] dark:bg-[var(--ios-group-bg)]"
        aria-label="Live stack"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-neutral-500">
          <Activity className="h-4 w-4 text-[#0071e3] dark:text-[var(--workspace-accent)]" aria-hidden />
          <span className="font-semibold text-neutral-900 dark:text-[var(--ios-label)]">
            Live stack
          </span>
          <span className="text-neutral-300">·</span>
          <span>
            {health === null
              ? "Checking…"
              : health.storageBackend === undefined
                ? "—"
                : health.storageBackend === "supabase"
                  ? "Cloud database"
                  : "Embedded database"}
          </span>
          <span className="text-neutral-300">·</span>
          <span>
            {health?.extractionMode === "ai"
              ? "LLM extraction"
              : health?.extractionMode === "offline"
                ? "Heuristic extraction"
                : "—"}
          </span>
          <Link
            href="/settings#connections"
            className="ml-auto font-semibold text-[#0071e3] hover:underline dark:text-[var(--workspace-accent)]"
          >
            Open
          </Link>
        </div>
      </section>

      {/* ── Category pills ── */}
      <section aria-labelledby="browse-heading">
        <h2
          id="browse-heading"
          className="text-[24px] font-bold tracking-tight text-neutral-900 dark:text-[var(--ios-label)]"
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
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.97] ${
                category === c.id
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:bg-white/[0.1]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-neutral-500 dark:text-[var(--ios-secondary)]">
          {showGrouped
            ? `${ALL_MARKETPLACE_APPS.length} listings`
            : `${filtered.length} app${filtered.length === 1 ? "" : "s"}${query ? ` matching "${query}"` : ""}`}
        </p>

        {showGrouped ? (
          <div className="mt-6 space-y-8">
            {/* AI engines + providers by section */}
            {installableSections.map((section) => (
              <SectionCard
                key={section.categoryId}
                title={section.label}
                count={section.count}
              >
                {section.apps.map((app, i) => (
                  <AppStoreRow key={app.id} app={app} index={i} />
                ))}
              </SectionCard>
            ))}

            {/* Route5 native */}
            <div>
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.1em] text-neutral-400 dark:text-[var(--ios-secondary)]">
                Route5 Built-in
              </h3>
              <SectionCard>
                {marketplaceNativeBrowseOrdered()
                  .slice(0, 12)
                  .map((app, i) => (
                    <AppStoreRow key={app.id} app={app} index={i} />
                  ))}
              </SectionCard>
              {marketplaceNativeBrowseOrdered().length > 12 && (
                <details className="mt-2">
                  <summary className="cursor-pointer px-2 text-[13px] font-medium text-[#0071e3] hover:underline dark:text-[var(--workspace-accent)]">
                    Show {marketplaceNativeBrowseOrdered().length - 12} more
                  </summary>
                  <SectionCard>
                    {marketplaceNativeBrowseOrdered()
                      .slice(12)
                      .map((app, i) => (
                        <AppStoreRow key={app.id} app={app} index={i} />
                      ))}
                  </SectionCard>
                </details>
              )}
            </div>

            {/* Stack */}
            <div>
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.1em] text-neutral-400 dark:text-[var(--ios-secondary)]">
                Your infrastructure
              </h3>
              <SectionCard>
                {marketplaceStackBrowseOrdered().map((app, i) => (
                  <AppStoreRow key={app.id} app={app} index={i} />
                ))}
              </SectionCard>
            </div>

            {/* Roadmap */}
            <div>
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.1em] text-neutral-400 dark:text-[var(--ios-secondary)]">
                Connectors (Roadmap)
              </h3>
              <p className="mb-2 text-[12px] text-neutral-400">
                Planned — not installed yet.
              </p>
              <SectionCard>
                {marketplaceRoadmapBrowseOrdered().map((app, i) => (
                  <AppStoreRow key={app.id} app={app} index={i} />
                ))}
              </SectionCard>
            </div>
          </div>
        ) : (
          <>
            <SectionCard>
              {filtered.map((app, i) => (
                <AppStoreRow key={app.id} app={app} index={i} />
              ))}
            </SectionCard>
            {filtered.length === 0 && (
              <p className="mt-8 text-center text-[15px] text-neutral-500 dark:text-[var(--ios-secondary)]">
                No matches. Try another search or category.
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Footer ── */}
      <section className="mt-12 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-sm sm:p-8 dark:border-white/[0.08] dark:bg-[var(--workspace-surface)]">
        <div className="flex flex-wrap items-start gap-3">
          <Star className="h-7 w-7 fill-amber-400 text-amber-400" aria-hidden />
          <div>
            <p className="text-[15px] font-semibold text-neutral-900 dark:text-[var(--ios-label)]">
              Scope
            </p>
            <p className="mt-1 max-w-xl text-[13px] text-neutral-500 dark:text-[var(--ios-secondary)]">
              {PRODUCT_HONEST.oneLine}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/account/plans"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-[14px] font-semibold text-white transition active:scale-[0.98] dark:bg-[var(--workspace-accent)]"
          >
            Plans
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-neutral-900 transition active:scale-[0.98] dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white"
          >
            Support
          </Link>
        </div>
      </section>
    </motion.div>
  );
}

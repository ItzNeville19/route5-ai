"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import { BrandSquircle } from "@/components/marketplace/brand-icons";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { getAppScreenCopy } from "@/lib/marketplace-app-details";
import {
  contactHref,
  type MarketplaceApp,
} from "@/lib/marketplace-catalog";
import { launchHrefForApp } from "@/lib/marketplace-links";

const appleEase = [0.22, 1, 0.36, 1] as const;

type Health = {
  storageBackend?: "supabase" | "sqlite";
  storageReady?: boolean;
  extractionMode?: "ai" | "offline";
};

function kindLabel(kind: MarketplaceApp["kind"]): string {
  if (kind === "native") return "Built-in";
  if (kind === "stack") return "Your stack";
  return "Roadmap";
}

function IOSRow({
  href,
  external,
  children,
  variant = "nav",
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
  variant?: "nav" | "destructive";
}) {
  const cls =
    variant === "destructive"
      ? "text-red-600"
      : "text-[var(--ios-label)]";
  const rowClass = `flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 transition-colors active:bg-black/[0.04] ${cls}`;
  const inner = (
    <>
      <span className="min-w-0 flex-1 text-left text-[17px] leading-snug">{children}</span>
      {external ? (
        <ExternalLink className="h-4 w-4 shrink-0 opacity-35" aria-hidden />
      ) : (
        <ChevronRight className="h-[15px] w-[15px] shrink-0 text-[var(--ios-separator)] opacity-60" aria-hidden />
      )}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={rowClass}>
      {inner}
    </Link>
  );
}

function IOSInsetGroup({ children, footer }: { children: ReactNode; footer?: string }) {
  return (
    <div className="px-4">
      <div className="flex flex-col divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[10px] bg-[var(--ios-group-bg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        {children}
      </div>
      {footer ? (
        <p className="mt-2 px-2 text-[13px] leading-relaxed text-[var(--ios-secondary)]">{footer}</p>
      ) : null}
    </div>
  );
}

const stickyBtnClass =
  "flex h-[50px] w-full items-center justify-center rounded-[12px] bg-[var(--workspace-accent)] text-[17px] font-semibold text-white shadow-lg shadow-black/45 transition-transform active:scale-[0.98] sm:h-[52px]";

function StickyLaunchCta({ app }: { app: MarketplaceApp }) {
  const router = useRouter();
  const exp = useWorkspaceExperience();
  const isExternalApi = app.href?.startsWith("/api/") ?? false;
  const inAppHref = launchHrefForApp(app);
  const [installing, setInstalling] = useState(false);
  const installed = exp.isMarketplaceInstalled(app.id);

  if (app.kind === "roadmap") {
    const secondaryClass =
      "flex min-h-[48px] w-full items-center justify-center rounded-[12px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 text-[16px] font-semibold text-[var(--workspace-fg)] shadow-sm transition active:scale-[0.98] sm:min-h-[50px]";
    const deskPrimaryClass =
      "flex min-h-[50px] w-full items-center justify-center rounded-[12px] bg-[var(--workspace-fg)] text-[17px] font-semibold text-[var(--workspace-canvas)] shadow-lg transition-transform active:scale-[0.98] sm:min-h-[52px]";
    return (
      <div className="flex flex-col gap-2">
        <Link href="/desk" className={deskPrimaryClass}>
          Use Desk
        </Link>
        {app.contactTopic ? (
          <Link href={contactHref(app.contactTopic)} className={secondaryClass}>
            Join waitlist
          </Link>
        ) : null}
        {app.learnMoreUrl ? (
          <a
            href={app.learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryClass}
          >
            {app.contactTopic ? "Vendor site" : "Learn more"}
          </a>
        ) : null}
      </div>
    );
  }

  if (!app.href) return null;

  if (isExternalApi) {
    return (
      <a href={inAppHref} target="_blank" rel="noopener noreferrer" className={stickyBtnClass}>
        Open
      </a>
    );
  }

  function openApp() {
    router.push(inAppHref);
  }

  /** App Store–style GET → install animation → Open (idempotent once installed). */
  if (app.kind === "native" || app.kind === "stack") {
    if (installed) {
      return (
        <button type="button" className={stickyBtnClass} onClick={openApp}>
          Open
        </button>
      );
    }
    return (
      <button
        type="button"
        disabled={installing}
        className={`${stickyBtnClass} disabled:opacity-80`}
        onClick={() => {
          setInstalling(true);
          window.setTimeout(() => {
            exp.installMarketplaceApp(app.id);
            exp.pushToast(`${app.name} is ready in your workspace.`, "success");
            setInstalling(false);
            openApp();
          }, 1200);
        }}
      >
        {installing ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Installing…
          </span>
        ) : (
          "GET"
        )}
      </button>
    );
  }

  return (
    <button type="button" className={stickyBtnClass} onClick={openApp}>
      Open
    </button>
  );
}

export default function MarketplaceAppLaunchScreen({
  app,
  health,
}: {
  app: MarketplaceApp;
  health: Health | null;
}) {
  const copy = getAppScreenCopy(app);
  const openHref = app.href ? launchHrefForApp(app) : null;
  const isExternal = app.href?.startsWith("/api/");
  const manageExternal = app.manageUrl
    ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
    : {};

  const stackHint =
    app.kind === "stack" && health
      ? app.id === "supabase"
        ? health.storageBackend === "supabase"
          ? "Cloud database active"
          : "Embedded database active"
        : app.id === "openai"
          ? health.extractionMode === "ai"
            ? "LLM extraction"
            : "Heuristic extraction"
          : null
      : null;

  return (
    <div className="ios-app-screen pb-28 pt-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: appleEase }}
        className="mx-auto max-w-lg px-4"
      >
        <Link
          href="/marketplace"
          className="mb-6 inline-flex min-h-[44px] items-center gap-1 text-[17px] font-normal text-[var(--workspace-accent)] transition-opacity hover:opacity-80"
        >
          <ChevronLeft className="h-[22px] w-[22px] opacity-90" strokeWidth={2} aria-hidden />
          Marketplace
        </Link>

        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.5, ease: appleEase }}
          >
            <BrandSquircle id={app.brandId} sizeClass="h-[88px] w-[88px] sm:h-24 sm:w-24" />
          </motion.div>
          <h1 className="mt-5 text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ios-label)] sm:text-[32px]">
            {app.name}
          </h1>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--ios-secondary)]">
            {app.subtitle}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px] text-[var(--ios-secondary)]">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.05] px-2.5 py-1 font-medium">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              4.8
            </span>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 font-medium">
              v1.{Math.min(9, Math.max(0, app.name.length % 10))}.0
            </span>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 font-medium">
              {kindLabel(app.kind)}
              {app.kind === "roadmap" ? " · Desk works today" : ""}
            </span>
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: appleEase }}
          className="mt-10"
        >
          <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wide text-[var(--ios-secondary)]">
            About
          </h2>
          <p className="px-4 text-[15px] leading-relaxed text-[var(--ios-label)]">{copy.about}</p>
          <ul className="mt-4 space-y-2 px-4">
            {copy.highlights.map((h) => (
              <li
                key={h}
                className="flex gap-2 text-[15px] leading-snug text-[var(--ios-secondary)] before:mt-2 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-[var(--workspace-accent)] before:content-['']"
              >
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {stackHint ? (
          <p className="mt-6 px-4 text-center text-[13px] text-[var(--ios-secondary)]">{stackHint}</p>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: appleEase }}
          className="mt-10 space-y-8"
        >
          {app.kind === "native" && openHref ? (
            <div>
              <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wide text-[var(--ios-secondary)]">
                Open
              </h2>
              <IOSInsetGroup footer="Opens in this workspace unless noted.">
                <IOSRow href={openHref} external={isExternal}>
                  Open {app.name}
                </IOSRow>
              </IOSInsetGroup>
            </div>
          ) : null}

          {app.kind === "native" && app.manageUrl ? (
            <div>
              <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wide text-[var(--ios-secondary)]">
                Manage
              </h2>
              <IOSInsetGroup footer="External vendor console.">
                <a
                  href={app.manageUrl}
                  {...manageExternal}
                    className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 text-[17px] text-[var(--ios-label)] transition-colors active:bg-black/[0.04]"
                >
                  <span>Account or service dashboard</span>
                  <ExternalLink className="h-4 w-4 shrink-0 opacity-35" aria-hidden />
                </a>
              </IOSInsetGroup>
            </div>
          ) : null}

          {app.kind === "stack" && openHref ? (
            <div>
              <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wide text-[var(--ios-secondary)]">
                Status &amp; consoles
              </h2>
              <IOSInsetGroup>
                <IOSRow href={openHref} external={isExternal}>
                  {app.id === "clerk" ? "Open account settings" : "View live status"}
                </IOSRow>
                {app.manageUrl ? (
                  <a
                    href={app.manageUrl}
                    {...manageExternal}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-[17px] text-[var(--ios-label)] transition-colors active:bg-black/[0.04]"
                  >
                    <span>Vendor console</span>
                    <ExternalLink className="h-4 w-4 shrink-0 opacity-35" aria-hidden />
                  </a>
                ) : null}
              </IOSInsetGroup>
            </div>
          ) : null}

          {app.kind === "roadmap" ? (
            <div>
              <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wide text-[var(--ios-secondary)]">
                Next steps
              </h2>
              <IOSInsetGroup>
                {app.learnMoreUrl ? (
                  <a
                    href={app.learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-[17px] text-[var(--ios-label)] transition-colors active:bg-black/[0.04]"
                  >
                    <span>Learn more</span>
                    <ExternalLink className="h-4 w-4 shrink-0 opacity-35" aria-hidden />
                  </a>
                ) : null}
                {app.contactTopic ? (
                  <Link
                    href={contactHref(app.contactTopic)}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-[17px] text-[var(--ios-label)] transition-colors active:bg-black/[0.04]"
                  >
                    <span>Request this integration</span>
                    <ChevronRight className="h-[15px] w-[15px] shrink-0 text-[var(--ios-separator)] opacity-60" aria-hidden />
                  </Link>
                ) : null}
              </IOSInsetGroup>
            </div>
          ) : null}
        </motion.div>
      </motion.div>

      {/* App Store–style sticky GET / Open bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[var(--workspace-canvas)] via-[var(--workspace-canvas)]/95 to-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8">
        <div className="pointer-events-auto mx-auto max-w-lg px-4">
          <p className="mb-2 text-center text-[11px] font-medium text-[var(--ios-secondary)]">
            Works offline-first · one tap adds to your workspace library
          </p>
          <StickyLaunchCta app={app} />
        </div>
      </div>
    </div>
  );
}

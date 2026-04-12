"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { BILLING_LIVE, PLAN_TIERS, type PlanTierId } from "@/lib/plans-catalog";
import { easeApple } from "@/lib/motion";

function Cta({
  tierId,
  cta,
  currentTier,
  loadingEntitlements,
}: {
  tierId: PlanTierId;
  cta: string;
  currentTier: PlanTierId | null;
  loadingEntitlements: boolean;
}) {
  if (loadingEntitlements) {
    return (
      <span
        className="inline-flex w-full justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 py-2.5 text-[13px] font-medium text-[var(--workspace-muted-fg)]"
        aria-busy
      >
        Loading plan…
      </span>
    );
  }
  if (tierId === "free") {
    return (
      <span className="inline-flex w-full justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 py-2.5 text-[13px] font-medium text-[var(--workspace-muted-fg)]">
        Included today
      </span>
    );
  }
  if (currentTier && tierId === currentTier) {
    return (
      <span className="inline-flex w-full justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/[0.08] py-2.5 text-[13px] font-semibold text-emerald-100">
        Your plan
      </span>
    );
  }
  if (tierId === "enterprise" || tierId === "ultra") {
    return (
      <Link
        href={`/contact?subject=${encodeURIComponent(`Route5 ${tierId} plan`)}`}
        className="inline-flex w-full justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/40"
      >
        {cta}
      </Link>
    );
  }
  if (BILLING_LIVE) {
    return (
      <Link
        href={`/contact?subject=${encodeURIComponent(`Route5 ${tierId} — purchase`)}`}
        title="Contact to complete purchase — card checkout when integrated"
        className="inline-flex w-full justify-center rounded-xl bg-[var(--workspace-accent)] py-2.5 text-[13px] font-semibold text-[var(--workspace-on-accent)] transition hover:opacity-95"
      >
        {cta}
      </Link>
    );
  }
  return (
    <Link
      href={`/contact?subject=${encodeURIComponent("Route5 Pro")}`}
      className="inline-flex w-full justify-center rounded-xl bg-[var(--workspace-accent)] py-2.5 text-[13px] font-semibold text-[var(--workspace-on-accent)] transition hover:opacity-95"
    >
      {cta}
    </Link>
  );
}

export default function AccountPlansClient() {
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const currentTier = entitlements?.tier ?? null;
  const reduceMotion = useReducedMotion();
  const onFree = !loadingEntitlements && currentTier === "free";

  return (
    <div>
      {onFree ? (
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeApple }}
          className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.09] to-transparent px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200/95">
              Free workspace
            </p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--workspace-fg)]">
              Unlock Pro capacity, Slack, and full exports
            </p>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Your Overview stats already reflect plan limits. Upgrade for higher monthly runs, advanced analytics, and
              connector depth — same product, more headroom.
            </p>
          </div>
          <Link
            href={BILLING_LIVE ? "/contact" : "/contact?subject=Route5%20Pro"}
            className="mt-4 inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--workspace-accent)] px-6 py-2.5 text-[13px] font-semibold text-[var(--workspace-on-accent)] shadow-md transition hover:opacity-95 sm:mt-0"
          >
            {BILLING_LIVE ? "Subscribe" : "Get Pro"}
          </Link>
        </motion.div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
      {PLAN_TIERS.map((tier, i) => (
        <motion.div
          key={tier.id}
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, delay: 0.06 * i, ease: easeApple }}
          className={`flex flex-col rounded-2xl border p-5 backdrop-blur-sm ${
            tier.highlighted
              ? "border-[var(--workspace-accent)]/45 bg-[var(--workspace-accent)]/[0.07] shadow-[0_0_40px_-20px_rgba(139,92,246,0.35)]"
              : "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80"
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
              {tier.name}
            </p>
            <p className="text-[22px] font-semibold tabular-nums text-[var(--workspace-fg)]">
              {tier.price}
              {tier.price !== "Custom" ? (
                <span className="text-[13px] font-medium text-[var(--workspace-muted-fg)]"> / mo</span>
              ) : null}
            </p>
          </div>
          <p className="mt-2 text-[14px] font-medium text-[var(--workspace-fg)]">{tier.tagline}</p>
          <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[12px] leading-relaxed text-zinc-400">
            {tier.valueNote}
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[var(--workspace-accent)]" aria-hidden>
                  ✓
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {tier.id === "enterprise" ? (
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Security questionnaire, DPA, and procurement:{" "}
              <Link href="/trust" className="font-medium text-[var(--workspace-accent)] hover:underline">
                Trust &amp; compliance
              </Link>
              .
            </p>
          ) : null}
          <div className="mt-5">
            <Cta
              tierId={tier.id}
              cta={tier.cta}
              currentTier={currentTier}
              loadingEntitlements={loadingEntitlements}
            />
          </div>
        </motion.div>
      ))}
      </div>
    </div>
  );
}

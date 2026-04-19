"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { easeApple } from "@/lib/motion";

export default function AccountPlansClient() {
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const reduceMotion = useReducedMotion();
  const planLabel = entitlements?.tierLabel ?? "Workspace plan";
  const tagline = entitlements?.tierTagline ?? "Execution support tailored to your team.";

  return (
    <div>
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeApple }}
        className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-6"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
          Current plan
        </p>
        <p className="mt-2 text-[22px] font-semibold text-[var(--workspace-fg)]">
          {loadingEntitlements ? "Loading…" : planLabel}
        </p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {tagline}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href="mailto:neville@rayze.xyz?subject=Route5%20Pricing"
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--workspace-accent)] px-6 py-2.5 text-[13px] font-semibold text-[var(--workspace-on-accent)] shadow-md transition hover:opacity-95"
          >
            Contact for Pricing
          </a>
          <Link
            href="/workspace/billing"
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--workspace-border)] px-6 py-2.5 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/40"
          >
            Open billing workspace
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

export default function WorkspaceBillingPage() {
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const planLabel = entitlements?.tierLabel ?? "Workspace plan";
  const planTagline =
    entitlements?.tierTagline ?? "Built for teams that cannot afford execution drift.";

  return (
    <div className="mx-auto w-full max-w-[min(100%,840px)] pb-24">
      <div className="mb-8">
        <Link
          href="/desk"
          className="group inline-flex items-center gap-1 text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">←</span>
          Desk
        </Link>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
          Workspace
        </p>
        <h1 className="mt-2 text-[clamp(1.5rem,3.5vw,1.85rem)] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
          Billing
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Route5 plans are managed directly with our team so your rollout, pricing, and support
          are aligned from day one. New workspaces include a 3-day cardless trial.
        </p>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Everyone in your organization sees the same plan tier here: billing is stored per organization
          (cloud-backed), and invited members use that org&apos;s subscription—not a separate personal
          plan.
        </p>
      </div>

      {loadingEntitlements ? (
        <div className="space-y-4" aria-busy aria-label="Loading plan">
          <div className="h-36 animate-pulse rounded-2xl border border-[var(--workspace-border)]/60 bg-[var(--workspace-surface)]/50" />
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--workspace-border)]/60 bg-[var(--workspace-surface)]/40" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
              Current plan status
            </p>
            <p className="mt-1 text-[22px] font-semibold text-[var(--workspace-fg)]">{planLabel}</p>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
              {planTagline}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="mailto:neville@rayze.xyz?subject=Route5%20Pricing"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--workspace-accent)] px-5 py-2.5 text-[14px] font-semibold text-[var(--workspace-on-accent)] shadow-[0_8px_28px_-12px_rgba(139,92,246,0.55)] transition hover:opacity-95"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Contact for Pricing
              </a>
              <p className="text-[13px] text-[var(--workspace-muted-fg)]">
                Want to upgrade or discuss team pricing? Contact us directly.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
            <h2 className="text-[14px] font-semibold text-[var(--workspace-fg)]">
              Dedicated account support
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              We work directly with teams on rollout scope, security reviews, and commercial terms.
              No self-serve checkout flow is used in this workspace. After trial, contact
              neville@rayze.xyz to continue.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

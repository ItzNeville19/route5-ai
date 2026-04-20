"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { planDisplayName, recommendedPlanAfterLimit } from "@/lib/billing/plans";
import type { BillingPlanId, UpgradePromptPayload } from "@/lib/billing/types";

type BillingUpgradeCtx = {
  showUpgrade: (u: UpgradePromptPayload) => void;
  close: () => void;
};

function limitDisplayLabel(limitHit: UpgradePromptPayload["limitHit"]): string {
  switch (limitHit) {
    case "commitments":
      return "Commitments";
    case "integrations":
      return "Integrations";
    case "export":
      return "Export";
    case "seats":
      return "Seats";
    case "projects":
      return "Projects";
    default:
      return limitHit;
  }
}

const BillingUpgradeContext = createContext<BillingUpgradeCtx | null>(null);

export function useBillingUpgrade(): BillingUpgradeCtx {
  const ctx = useContext(BillingUpgradeContext);
  if (!ctx) {
    throw new Error("useBillingUpgrade must be used within BillingUpgradeProvider");
  }
  return ctx;
}

function UpgradeModal({
  payload,
  onClose,
}: {
  payload: UpgradePromptPayload;
  onClose: () => void;
}) {
  const titleId = useId();
  const isEnterprise = payload.currentPlan === "enterprise";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id={titleId} className="text-[16px] font-semibold text-[var(--workspace-fg)]">
                Upgrade your workspace
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                {payload.message}
              </p>
              <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">
                Current plan:{" "}
                <span className="font-medium text-[var(--workspace-fg)]">
                  {planDisplayName(payload.currentPlan)}
                </span>
                {" · "}
                Limit:{" "}
                <span className="font-medium text-[var(--workspace-fg)]">
                  {limitDisplayLabel(payload.limitHit)}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)] disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-3 text-[12px] text-[var(--workspace-muted-fg)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
            Plan model
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-[var(--workspace-fg)]">Starter</p>
              <p className="mt-1">3-day trial baseline (no card) · contact to continue</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--workspace-fg)]">Growth</p>
              <p className="mt-1">Higher limits + rollout support via direct contact</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--workspace-fg)]">Enterprise</p>
              <p className="mt-1">Unlimited everything · Custom seats · Dedicated support</p>
            </div>
          </div>
        </div>
        {isEnterprise ? (
          <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
            Enterprise workspace detected. Upgrade prompts should not block your workflow.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-white/[0.04] disabled:opacity-50"
          >
            Not now
          </button>
          <a
            href="mailto:neville@rayze.xyz?subject=Route5%20Plan%20Support"
            className="rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-violet-500"
          >
            Contact to Continue
          </a>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Support:{" "}
          <a
            href="mailto:neville@rayze.xyz?subject=Route5%20Support"
            className="font-medium text-[var(--workspace-accent)] hover:underline"
          >
            neville@rayze.xyz
          </a>
        </p>
      </div>
    </div>
  );
}

function BillingLimitQuerySync() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { showUpgrade } = useBillingUpgrade();

  useEffect(() => {
    const lim = searchParams.get("billingLimit");
    if (
      !lim ||
      (lim !== "integrations" &&
        lim !== "commitments" &&
        lim !== "export" &&
        lim !== "seats" &&
        lim !== "projects")
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/state", { credentials: "same-origin" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { plan?: BillingPlanId };
        const current = data.plan ?? "free";
        if (current === "enterprise") {
          return;
        }
        const hit = lim as UpgradePromptPayload["limitHit"];
        showUpgrade({
          currentPlan: current,
          limitHit: hit,
          recommendedPlan: recommendedPlanAfterLimit(current, hit),
          message:
            hit === "integrations"
              ? "You’ve reached your integration limit on this plan. Upgrade to connect more tools."
              : hit === "commitments"
                ? "You’ve reached your commitment limit on this plan. Upgrade to track more work."
                : hit === "export"
                  ? "Dashboard export requires a paid plan."
                  : hit === "projects"
                    ? "You’ve reached your project limit on this plan. Upgrade to create more projects."
                  : "You’ve reached the seat limit for this plan. Upgrade to invite more teammates.",
        });
        const next = new URLSearchParams(searchParams.toString());
        next.delete("billingLimit");
        const q = next.toString();
        window.history.replaceState(null, "", q ? `${pathname}?${q}` : pathname);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, showUpgrade]);

  return null;
}

export function BillingUpgradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<UpgradePromptPayload | null>(null);

  const showUpgrade = useCallback((u: UpgradePromptPayload) => {
    setPayload(u);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPayload(null);
  }, []);

  return (
    <BillingUpgradeContext.Provider value={{ showUpgrade, close }}>
      {children}
      {open && payload ? <UpgradeModal payload={payload} onClose={close} /> : null}
    </BillingUpgradeContext.Provider>
  );
}

export function BillingLimitQueryListener() {
  return (
    <Suspense fallback={null}>
      <BillingLimitQuerySync />
    </Suspense>
  );
}

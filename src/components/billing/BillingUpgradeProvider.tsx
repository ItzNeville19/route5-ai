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
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultPlan: "starter" | "growth" =
    payload.recommendedPlan === "growth" ? "growth" : "starter";

  const [selectedPlan, setSelectedPlan] = useState<"starter" | "growth">(defaultPlan);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          billingPeriod: annual ? "annual" : "monthly",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
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
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)] disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-3 text-[12px] text-[var(--workspace-muted-fg)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
            Compare plans
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-[var(--workspace-fg)]">Starter</p>
              <p className="mt-1">50 commitments · 5 seats · 2 integrations · Export</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--workspace-fg)]">Growth</p>
              <p className="mt-1">Unlimited commitments · 25 seats · All integrations</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--workspace-fg)]">Enterprise</p>
              <p className="mt-1">Unlimited everything · Custom seats · Dedicated support</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">Bill yearly</span>
          <button
            type="button"
            onClick={() => setAnnual(!annual)}
            className={`relative h-7 w-12 rounded-full transition ${annual ? "bg-violet-600" : "bg-[var(--workspace-border)]"}`}
            aria-pressed={annual}
            aria-label="Toggle annual billing"
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                annual ? "translate-x-5" : ""
              }`}
            />
          </button>
          <span className="text-[12px] text-emerald-400/90">{annual ? "Save ~20% vs monthly" : ""}</span>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">Checkout plan</p>
          <div className="flex flex-wrap gap-2">
            {(["starter", "growth"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPlan(p)}
                className={`rounded-xl border px-3 py-2 text-[13px] font-medium transition ${
                  selectedPlan === p
                    ? "border-violet-500/50 bg-violet-500/10 text-[var(--workspace-fg)]"
                    : "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)] hover:border-[var(--workspace-accent)]/35"
                }`}
              >
                {planDisplayName(p)}
                <span className="ml-2 tabular-nums text-[11px] opacity-80">
                  {p === "starter"
                    ? annual
                      ? "$2,990/yr"
                      : "$299/mo"
                    : annual
                      ? "$7,990/yr"
                      : "$799/mo"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-[13px] text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-white/[0.04] disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50"
          >
            {busy ? "Redirecting…" : "Upgrade with Stripe"}
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Enterprise?{" "}
          <a
            href="mailto:sales@route5.ai?subject=Route5%20Enterprise"
            className="font-medium text-[var(--workspace-accent)] hover:underline"
          >
            Contact sales
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

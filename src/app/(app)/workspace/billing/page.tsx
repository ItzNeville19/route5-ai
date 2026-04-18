"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink, Mail } from "lucide-react";
import { planDisplayName } from "@/lib/billing/plans";
import type { BillingPlanId, UpgradePromptPayload } from "@/lib/billing/types";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";

type BillingStateJson = {
  plan: BillingPlanId;
  planLabel: string;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    seatCount: number;
  } | null;
  paymentIssue: boolean;
  usage: {
    commitments: { used: number; limit: number | null };
    integrations: { used: number; limit: number | null };
    seats: { used: number; limit: number };
  };
  limits: { dashboardExport: boolean };
  invoices: {
    id: string;
    createdAt: string;
    amountCents: number;
    currency: string;
    status: string;
    invoicePdfUrl: string | null;
    invoiceUrl: string | null;
  }[];
};

export default function WorkspaceBillingPage() {
  const { showUpgrade } = useBillingUpgrade();
  const [state, setState] = useState<BillingStateJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"starter" | "growth">("starter");
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/state", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as BillingStateJson & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load billing.");
        setState(null);
        return;
      }
      setState(data);
    } catch {
      setError("Could not load billing.");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startCheckout() {
    setBusy("checkout");
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: checkoutPlan,
          billingPeriod: annual ? "annual" : "monthly",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Checkout unavailable.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      window.location.href = "/api/billing/portal";
    } finally {
      setBusy(null);
    }
  }

  async function tryInvite() {
    setBusy("invite");
    try {
      const res = await fetch("/api/billing/invite", { method: "POST", credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        upgrade?: UpgradePromptPayload;
      };
      if (res.status === 409 && data.upgrade) {
        showUpgrade(data.upgrade);
        return;
      }
      if (res.status === 409) {
        setError("Seat limit reached — upgrade to invite more teammates.");
        return;
      }
      if (!res.ok) {
        setError(typeof data === "object" && data && "error" in data ? String((data as { error: string }).error) : "Could not verify seats.");
        return;
      }
      setError(null);
      alert(data.message ?? "OK");
    } finally {
      setBusy(null);
    }
  }

  const enterprise = state?.plan === "enterprise";

  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] pb-24">
      <div className="mb-6">
        <Link
          href="/overview"
          className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          ← Overview
        </Link>
        <h1 className="sr-only">Billing</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Subscription, usage, and invoices. Payments are processed securely by Stripe.
        </p>
      </div>

      {loading ? (
        <p className="text-[13px] text-[var(--workspace-muted-fg)]">Loading billing…</p>
      ) : error && !state ? (
        <p className="text-[13px] text-red-400">{error}</p>
      ) : state ? (
        <div className="space-y-6">
          {state.paymentIssue ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100">
              <strong className="font-semibold">Payment failed</strong> — update your payment method in the Stripe
              customer portal to restore access.
            </div>
          ) : null}

          <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                  Current plan
                </p>
                <p className="mt-1 text-[20px] font-semibold text-[var(--workspace-fg)]">{state.planLabel}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-[var(--workspace-border)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--workspace-muted-fg)]">
                    {state.subscription?.status ?? "none"}
                  </span>
                  {state.subscription?.cancelAtPeriodEnd ? (
                    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
                      Cancels at period end
                    </span>
                  ) : null}
                </div>
                {state.subscription?.currentPeriodEnd ? (
                  <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]">
                    Next billing date:{" "}
                    {new Date(state.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                ) : null}
                {state.subscription?.trialEnd ? (
                  <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
                    Trial ends {new Date(state.subscription.trialEnd).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {enterprise ? (
                  <a
                    href="mailto:sales@route5.ai?subject=Route5%20Enterprise"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                    Contact sales
                  </a>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void startCheckout()}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      <CreditCard className="h-4 w-4" aria-hidden />
                      {busy === "checkout" ? "Opening…" : "Upgrade / change plan"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null || !state.subscription?.status}
                      onClick={() => void openPortal()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-50"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Manage subscription
                    </button>
                  </>
                )}
              </div>
            </div>

            {!enterprise ? (
              <div className="mt-5 border-t border-[var(--workspace-border)]/80 pt-5">
                <p className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">Checkout options</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[12px] text-[var(--workspace-muted-fg)]">
                    <input
                      type="checkbox"
                      checked={annual}
                      onChange={(e) => setAnnual(e.target.checked)}
                      className="rounded border-[var(--workspace-border)]"
                    />
                    Annual (save ~20%)
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["starter", "growth"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCheckoutPlan(p)}
                      className={`rounded-xl border px-3 py-2 text-[13px] font-medium ${
                        checkoutPlan === p
                          ? "border-violet-500/50 bg-violet-500/10 text-[var(--workspace-fg)]"
                          : "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]"
                      }`}
                    >
                      {planDisplayName(p)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!enterprise ? (
              <div className="mt-5 border-t border-[var(--workspace-border)]/80 pt-5">
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="text-[13px] font-medium text-[var(--workspace-muted-fg)] underline-offset-2 hover:text-[var(--workspace-fg)] hover:underline"
                >
                  Cancel subscription
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
            <h2 className="text-[14px] font-semibold text-[var(--workspace-fg)]">Usage</h2>
            <ul className="mt-3 space-y-2 text-[13px] text-[var(--workspace-muted-fg)]">
              <li>
                Commitments: {state.usage.commitments.used}
                {state.usage.commitments.limit != null ? ` / ${state.usage.commitments.limit}` : " / ∞"}
              </li>
              <li>
                Seats: {state.usage.seats.used} / {state.usage.seats.limit}
              </li>
              <li>
                Integrations: {state.usage.integrations.used}
                {state.usage.integrations.limit != null ? ` / ${state.usage.integrations.limit}` : " / ∞"}
              </li>
              <li>Dashboard export: {state.limits.dashboardExport ? "Included" : "Not included"}</li>
            </ul>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void tryInvite()}
              className="mt-4 rounded-xl border border-dashed border-[var(--workspace-border)] px-4 py-2 text-[12px] font-medium text-[var(--workspace-muted-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:text-[var(--workspace-fg)] disabled:opacity-50"
            >
              Check seat availability (invite flow)
            </button>
          </section>

          <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
            <h2 className="text-[14px] font-semibold text-[var(--workspace-fg)]">Invoices</h2>
            {state.invoices.length === 0 ? (
              <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">No invoices yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--workspace-border)] text-[11px] uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-[var(--workspace-border)]/60">
                        <td className="py-2 pr-3 text-[var(--workspace-muted-fg)]">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-[var(--workspace-fg)]">
                          {(inv.amountCents / 100).toFixed(2)} {inv.currency.toUpperCase()}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="rounded-full border border-[var(--workspace-border)] px-2 py-0.5 text-[11px]">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2">
                          {inv.invoicePdfUrl ? (
                            <a
                              href={inv.invoicePdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[var(--workspace-accent)] hover:underline"
                            >
                              Download
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {error && state ? <p className="text-[13px] text-red-400">{error}</p> : null}
        </div>
      ) : null}

      {cancelOpen ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCancelOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden />
          <div className="relative z-[1] w-full max-w-md rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-xl">
            <h2 className="text-[16px] font-semibold text-[var(--workspace-fg)]">Cancel subscription</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              You&apos;ll open the Stripe customer portal where you can cancel or update your plan. You keep paid
              access until the end of the billing period unless you choose otherwise.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="rounded-xl border border-[var(--workspace-border)] px-4 py-2 text-[13px] font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(false);
                  void openPortal();
                }}
                className="rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white"
              >
                Open Stripe portal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

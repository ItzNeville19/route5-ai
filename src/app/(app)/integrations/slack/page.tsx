"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { deskUrl } from "@/lib/desk-routes";

export default function SlackIntegrationPage() {
  const { pushToast } = useWorkspaceExperience();
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const [loading, setLoading] = useState(true);
  const [planAllows, setPlanAllows] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/slack", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        planAllows?: boolean;
        configured?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setPlanAllows(false);
        setConfigured(false);
        setMessage(data.error ?? "Could not load.");
        return;
      }
      setPlanAllows(Boolean(data.planAllows));
      setConfigured(Boolean(data.configured));
      setMessage(data.message ?? null);
    } catch {
      setMessage("Could not reach the Slack integration endpoint.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slackEnabled = entitlements?.features.slackConnector ?? false;

  return (
    <div className="mx-auto max-w-[720px] pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Integrations
      </p>
      <div className="mt-3 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4A154B]/20 text-[#E01E5A] ring-1 ring-white/10">
          <MessageSquare className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">Slack</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Bring decision-making conversations from Slack into accountable execution. Route5 keeps owners, deadlines,
            and progress visible in one place.
          </p>
        </div>
      </div>

      {!loadingEntitlements && entitlements && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${
            slackEnabled
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-amber-500/25 bg-amber-500/[0.07] text-amber-100"
          }`}
        >
          {slackEnabled ? (
            <>
              <span className="font-semibold text-emerald-50">{entitlements.tierLabel}</span> — Slack features are
              included on your plan. {entitlements.tierTagline}
            </>
          ) : (
            <>
              <span className="font-semibold">Free plan</span> — Slack connector unlocks on{" "}
              <Link href="/account/plans" className="font-medium text-violet-300 underline-offset-2 hover:underline">
                Pro
              </Link>
              . You can still paste any text into Desk.
            </>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void load();
            pushToast("Refreshed", "success");
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh status
        </button>
        <Link
          href={deskUrl()}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--workspace-accent)] px-3 py-2 text-[13px] font-semibold text-[var(--workspace-on-accent)] transition hover:opacity-95"
        >
          Open Desk
        </Link>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
        >
          Slack in marketplace
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Link>
      </div>

      <div className="dashboard-home-card mt-8 rounded-2xl p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
          Deployment status
        </p>
        {loading ? (
          <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
        ) : (
          <>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--workspace-fg)]">{message}</p>
            <ul className="mt-4 space-y-2 text-[13px] text-[var(--workspace-muted-fg)]">
              <li className="flex gap-2">
                <span className={planAllows ? "text-emerald-400" : "text-zinc-400"}>●</span>
                Plan access: {planAllows ? "enabled" : "upgrade required"}
              </li>
              <li className="flex gap-2">
                <span className={configured ? "text-emerald-400" : "text-zinc-400"}>●</span>
                Server setup: {configured ? "connected" : "not configured yet"}
              </li>
            </ul>
          </>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-5 sm:p-6">
        <p className="text-[13px] font-semibold text-[var(--workspace-fg)]">Works today without OAuth</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <li>Copy a thread or export from Slack.</li>
          <li>
            Open <Link href={deskUrl()}>Desk</Link> and paste to create owners, deadlines, and commitments.
          </li>
          <li>When server setup is enabled, Slack routing can push directly into project workflows.</li>
        </ol>
      </div>

      <p className="mt-10 text-center text-[12px] text-[var(--workspace-muted-fg)]">
        <Link href="/settings#connections" className="font-medium text-[var(--workspace-accent)] hover:underline">
          ← All integrations
        </Link>
      </p>
    </div>
  );
}

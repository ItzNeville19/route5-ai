"use client";

import { useState } from "react";
import Link from "next/link";
import { deskUrl } from "@/lib/desk-routes";
import { IconGoogle } from "@/components/marketplace/brand-icons";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

export default function GoogleIntegrationPage() {
  const { pushToast } = useWorkspaceExperience();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function joinWaitlist() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/waitlist", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setEmail("");
        pushToast("Added to Google integration waitlist.", "success");
        return;
      }
      setErr(data.error === "already_registered" ? "Already registered." : data.error ?? "Could not join waitlist.");
    } catch {
      setErr("Could not join waitlist.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[800px] pb-24">
      <Link
        href="/settings#connections"
        className="text-[13px] font-medium text-[var(--workspace-muted-fg)] hover:text-[var(--workspace-fg)]"
      >
        ← Integrations
      </Link>
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--workspace-surface)] shadow-sm ring-1 ring-[var(--workspace-ring-subtle)]">
            <IconGoogle className="h-7 w-7 text-[var(--workspace-fg)]" aria-hidden />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
              Google Workspace
            </h1>
            <p className="mt-1 text-[14px] text-[var(--workspace-muted-fg)]">
              Bring Docs, Calendar context, and Gmail threads into one clear execution workflow.
            </p>
          </div>
        </div>

        <div className="dashboard-pro-card mt-8 p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-3 py-1 text-[11px] text-[var(--workspace-fg)]">
              Import-only now
            </span>
            <span className="rounded-full border border-amber-500/35 bg-amber-500/12 px-3 py-1 text-[11px] text-[var(--workspace-fg)]">
              OAuth waitlist
            </span>
          </div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
            Today
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
            Paste meeting notes or email excerpts into{" "}
            <Link href={deskUrl()} className="font-semibold text-[var(--workspace-accent)] hover:underline">
              Desk
            </Link>{" "}
            or a project to create accountable commitments. Native Google OAuth and file pickers are rolling out; when
            live, you&apos;ll connect once under Connections.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={deskUrl()}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--workspace-fg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95"
            >
              Open Desk
            </Link>
            <Link
              href="/settings#connections"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
            >
              All integrations
            </Link>
          </div>
          <div className="mt-6 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/45 p-4">
            <p className="text-[13px] font-semibold text-[var(--workspace-fg)]">Join OAuth rollout waitlist</p>
            <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
              We will notify you when native Google connection and file picker flows are live.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="min-h-[42px] flex-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 text-[13px] text-[var(--workspace-fg)]"
              />
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={() => void joinWaitlist()}
                className="rounded-xl bg-[var(--workspace-accent)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-on-accent)] disabled:opacity-45"
              >
                {busy ? "Joining..." : "Join waitlist"}
              </button>
            </div>
            {err ? <p className="mt-2 text-[12px] text-[var(--workspace-danger-fg)]">{err}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

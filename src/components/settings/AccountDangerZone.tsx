"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

export default function AccountDangerZone() {
  const { user, isLoaded } = useUser();
  const titleId = useId();
  const passwordEnabled = Boolean(user?.passwordEnabled);

  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAck(false);
      setReason("");
      setPhrase("");
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const reasonOk = reason.trim().length >= 20;
  const phraseOk = phrase.trim().toLowerCase() === "delete";
  const pwdOk = !passwordEnabled || password.trim().length > 0;
  const ready = ack && reasonOk && phraseOk && pwdOk;

  const submit = useCallback(async () => {
    setError(null);
    if (!ack || !reasonOk || !phraseOk || !pwdOk) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          confirmationPhrase: phrase.trim(),
          password: passwordEnabled ? password : undefined,
          reason: reason.trim(),
          acknowledgedPermanent: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete account.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }, [ack, passwordEnabled, phrase, password, pwdOk, reason, reasonOk, phraseOk]);

  return (
    <section
      className="rounded-2xl border border-red-500/40 bg-gradient-to-b from-red-950/[0.15] to-transparent p-5 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]"
      aria-labelledby={titleId}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-300">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
            Danger zone
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Destructive actions for your Route5 workspace and your Clerk sign-in. Nothing here deletes anything
            until you open the steps and confirm.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/10 px-4 py-3 text-left text-[13px] font-medium text-red-200/95 transition hover:bg-red-950/25"
          aria-expanded={open}
        >
          <span>Delete account {open ? "" : "(hidden — expand to continue)"}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <div className="mt-5 space-y-4 border-t border-red-500/25 pt-5">
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-[13px] leading-relaxed text-red-100/90">
            <p className="font-semibold text-red-100">This cannot be undone</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[12px] text-red-200/95">
              <li>Your Clerk account is removed — you will be signed out everywhere.</li>
              <li>Your Route5 projects and extractions for this account are deleted from our workspace.</li>
              <li>Billing and plan links go through Clerk; if you use a paid tier, resolve billing before deleting.</li>
            </ul>
          </div>

          <div>
            <label htmlFor="danger-reason" className="text-[12px] font-medium text-[var(--workspace-fg)]">
              Why do you want to delete your account?
            </label>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
              A short honest answer helps you confirm this is what you want — not a judgment.
            </p>
            <textarea
              id="danger-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={busy}
              className="mt-2 w-full resize-y rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              placeholder="e.g. I’m moving to another tool; I’m testing sign-up; I don’t need this workspace…"
            />
            <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
              {reason.trim().length}/4000 · minimum 20 characters
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[var(--workspace-border)]"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              disabled={busy}
            />
            <span className="text-[13px] leading-snug text-[var(--workspace-fg)]">
              I understand this is <strong className="font-semibold">permanent</strong> and I will lose access to
              this workspace and account data.
            </span>
          </label>

          <label className="block">
            <span className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">
              Type <span className="font-mono text-[var(--workspace-fg)]">delete</span> to confirm
            </span>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
              className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              placeholder="delete"
            />
          </label>

          {isLoaded && passwordEnabled ? (
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">
                Account password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
                className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
                placeholder="••••••••"
              />
            </label>
          ) : isLoaded ? (
            <p className="text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
              You signed in without a password (for example OAuth or magic link). Typing{" "}
              <span className="font-mono text-[var(--workspace-fg)]">delete</span> is enough to confirm — no
              password required.
            </p>
          ) : null}

          <p className="text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Still sure? When you’re ready, use the button below. If you’re unsure, close this section and keep
            your account.
          </p>

          {error ? (
            <p className="text-[13px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-white/[0.04] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !ready}
              onClick={() => void submit()}
              className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete my account permanently"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

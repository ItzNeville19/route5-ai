"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Trash2, X } from "lucide-react";

type Props = {
  projectId: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteProjectDialog({
  projectId,
  projectName,
  open,
  onClose,
  onDeleted,
}: Props) {
  const { user, isLoaded } = useUser();
  const titleId = useId();
  const passwordEnabled = Boolean(user?.passwordEnabled);

  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPhrase("");
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const submit = useCallback(async () => {
    setError(null);
    if (phrase.trim().toLowerCase() !== "delete") {
      setError('Type the word "delete" to confirm.');
      return;
    }
    if (passwordEnabled && !password.trim()) {
      setError("Enter your account password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          confirmationPhrase: phrase.trim(),
          password: passwordEnabled ? password : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete project.");
        return;
      }
      window.dispatchEvent(new Event("route5:project-updated"));
      onDeleted();
      onClose();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }, [phrase, password, passwordEnabled, projectId, onClose, onDeleted]);

  if (!open) return null;

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
        className="relative z-[1] w-full max-w-md rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              <Trash2 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id={titleId} className="text-[16px] font-semibold text-[var(--workspace-fg)]">
                Delete project
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                <span className="font-medium text-[var(--workspace-fg)]">{projectName}</span> and all
                captured decisions will be removed permanently. This cannot be undone.
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

        <div className="mt-5 space-y-3">
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
              className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              placeholder="delete"
              disabled={busy}
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
                className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
                placeholder="••••••••"
                disabled={busy}
              />
            </label>
          ) : isLoaded ? (
            <p className="text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
              You signed in without a password (for example OAuth). Typing{" "}
              <span className="font-mono text-[var(--workspace-fg)]">delete</span> is enough to confirm.
            </p>
          ) : null}
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
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </div>
    </div>
  );
}

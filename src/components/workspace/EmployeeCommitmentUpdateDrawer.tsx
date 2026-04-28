"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

type ActivityRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  completed_at: string | null;
  deadline: string;
};

type Props = {
  row: ActivityRow | null;
  onClose: () => void;
  onApplied: () => void;
};

function statusLabel(raw: string): string {
  const s = raw.replace(/_/g, " ").toLowerCase();
  const map: Record<string, string> = {
    "not started": "Not started",
    "not_started": "Not started",
    "in progress": "In progress",
    "in_progress": "In progress",
    "on track": "On track",
    on_track: "On track",
    "at risk": "Needs attention",
    at_risk: "Needs attention",
    overdue: "Late",
    completed: "Done",
  };
  return map[s] ?? raw.replace(/_/g, " ");
}

export default function EmployeeCommitmentUpdateDrawer({ row, onClose, onApplied }: Props) {
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (row) {
      setNote("");
      setError(null);
    }
  }, [row]);

  const apply = useCallback(
    async (kind: "in_progress" | "at_risk" | "done") => {
      if (!row) return;
      setSaving(true);
      setError(null);
      try {
        if (kind === "done") {
          const res = await fetch(`/api/commitments/${encodeURIComponent(row.id)}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: true }),
          });
          if (!res.ok) {
            const d = (await res.json().catch(() => ({}))) as { error?: string };
            setError(d.error ?? "Could not save.");
            return;
          }
        } else if (kind === "in_progress") {
          const res = await fetch(`/api/commitments/${encodeURIComponent(row.id)}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: false, status: "in_progress" }),
          });
          if (!res.ok) {
            const d = (await res.json().catch(() => ({}))) as { error?: string };
            setError(d.error ?? "Could not save.");
            return;
          }
        } else {
          const res = await fetch(`/api/commitments/${encodeURIComponent(row.id)}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: false, status: "at_risk" }),
          });
          if (!res.ok) {
            const d = (await res.json().catch(() => ({}))) as { error?: string };
            setError(d.error ?? "Could not save.");
            return;
          }
        }

        if (note.trim()) {
          const res = await fetch(`/api/commitments/${encodeURIComponent(row.id)}/comments`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: note.trim() }),
          });
          if (!res.ok) {
            const d = (await res.json().catch(() => ({}))) as { error?: string };
            setError(d.error ?? "Status saved; comment did not.");
          }
        }
        onApplied();
        onClose();
      } finally {
        setSaving(false);
      }
    },
    [row, note, onApplied, onClose]
  );

  if (!mounted || !row) return null;

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close update drawer"
        onClick={onClose}
      />
      <div
        className="relative z-[86] mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--workspace-accent)_25%,var(--workspace-border))] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--workspace-surface)_96%,transparent),color-mix(in_srgb,var(--workspace-canvas)_88%,transparent))] shadow-[0_28px_80px_-48px_rgba(0,0,0,0.75)] sm:m-0"
        role="dialog"
        aria-labelledby="emp-commitment-update-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--workspace-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">Update commitment</p>
            <h2 id="emp-commitment-update-title" className="mt-1 line-clamp-2 text-[16px] font-semibold leading-snug text-[var(--workspace-fg)]">
              {row.title}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">Current: {statusLabel(row.status)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="route5-pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-fg)_04%,transparent)] text-[var(--workspace-fg)] hover:border-[color-mix(in_srgb,var(--workspace-accent)_40%,var(--workspace-border))]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="px-5 py-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--workspace-muted-fg)]">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Brief update for admins — context, blocker, ETA…"
            rows={4}
            className="mt-2 w-full resize-y rounded-xl border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-fg)_04%,transparent)] px-3 py-2 text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          {error ? <p className="mt-2 text-[12px] text-amber-200">{error}</p> : null}
        </div>
        <footer className="flex flex-wrap gap-2 border-t border-[var(--workspace-border)] px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void apply("in_progress")}
            className="route5-pressable inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-950/35 px-3 py-2.5 text-[12px] font-semibold text-cyan-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "In progress"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void apply("at_risk")}
            className="route5-pressable inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl border border-amber-400/35 bg-amber-950/30 px-3 py-2.5 text-[12px] font-semibold text-amber-50 disabled:opacity-50"
          >
            Needs attention
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void apply("done")}
            className="route5-pressable inline-flex flex-[1_1_100%] items-center justify-center rounded-xl border border-emerald-400/38 bg-emerald-950/35 px-3 py-2.5 text-[12px] font-semibold text-emerald-50 disabled:opacity-50 sm:flex-1 sm:basis-auto"
          >
            Mark done
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

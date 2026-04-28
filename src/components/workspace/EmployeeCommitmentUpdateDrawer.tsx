"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import type { OrgCommitmentStatus } from "@/lib/org-commitment-types";

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
    not_started: "Not started",
    "in progress": "In progress",
    in_progress: "In progress",
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
  const { orgRole } = useWorkspaceData();
  const canLead = orgRole === "admin" || orgRole === "manager";
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (row) {
      setNote("");
      setError(null);
      try {
        if (row.deadline?.trim()) {
          const d = new Date(row.deadline);
          if (!Number.isNaN(d.getTime())) {
            setDeadlineInput(d.toISOString().slice(0, 10));
          } else {
            setDeadlineInput("");
          }
        } else {
          setDeadlineInput("");
        }
      } catch {
        setDeadlineInput("");
      }
    }
  }, [row]);

  const patchCommitment = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!row) return false;
      const res = await fetch(`/api/commitments/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Could not save.");
        return false;
      }
      return true;
    },
    [row]
  );

  const saveDeadlineAndNoteOnly = useCallback(async () => {
    if (!row) return;
    setSaving(true);
    setError(null);
    try {
      if (deadlineInput.trim()) {
        const t = new Date(`${deadlineInput}T12:00:00`).getTime();
        if (Number.isFinite(t)) {
          const ok = await patchCommitment({ deadline: new Date(t).toISOString() });
          if (!ok) return;
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
          setError(d.error ?? "Could not post note.");
          return;
        }
      }
      onApplied();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [row, deadlineInput, note, patchCommitment, onApplied, onClose]);

  const apply = useCallback(
    async (kind: "complete" | OrgCommitmentStatus) => {
      if (!row) return;
      setSaving(true);
      setError(null);
      try {
        if (kind === "complete") {
          const ok = await patchCommitment({ completed: true });
          if (!ok) return;
        } else {
          const ok = await patchCommitment({ completed: false, status: kind });
          if (!ok) return;
        }

        if (deadlineInput.trim()) {
          const t = new Date(`${deadlineInput}T12:00:00`).getTime();
          if (Number.isFinite(t)) {
            const ok = await patchCommitment({ deadline: new Date(t).toISOString() });
            if (!ok) return;
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
            setError(d.error ?? "Saved status; comment failed.");
          }
        }
        onApplied();
        onClose();
      } finally {
        setSaving(false);
      }
    },
    [row, note, deadlineInput, patchCommitment, onApplied, onClose]
  );

  if (!mounted || !row) return null;

  const statusButtons: { key: "complete" | OrgCommitmentStatus; label: string; className: string }[] = [
    {
      key: "not_started",
      label: "Not started",
      className: "border-white/15 bg-white/[0.06] text-[var(--workspace-fg)] hover:bg-white/[0.09]",
    },
    {
      key: "in_progress",
      label: "In progress",
      className: "border-cyan-500/35 bg-cyan-950/35 text-cyan-50 hover:bg-cyan-950/45",
    },
    {
      key: "on_track",
      label: "On track",
      className: "border-emerald-500/35 bg-emerald-950/30 text-emerald-50 hover:bg-emerald-950/42",
    },
    {
      key: "at_risk",
      label: "Needs attention",
      className: "border-amber-400/35 bg-amber-950/30 text-amber-50 hover:bg-amber-950/42",
    },
    {
      key: "complete",
      label: "Mark done",
      className: "border-emerald-400/45 bg-emerald-900/40 text-white hover:bg-emerald-800/45 sm:col-span-2",
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close update drawer"
        onClick={onClose}
      />
      <div
        className="relative z-[86] mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--workspace-accent)_25%,var(--workspace-border))] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--workspace-surface)_96%,transparent),color-mix(in_srgb,var(--workspace-canvas)_88%,transparent))] shadow-[0_28px_80px_-48px_rgba(0,0,0,0.75)] sm:m-0"
        role="dialog"
        aria-labelledby="emp-commitment-update-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--workspace-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
              Update commitment
            </p>
            <h2
              id="emp-commitment-update-title"
              className="mt-1 line-clamp-3 text-[16px] font-semibold leading-snug text-[var(--workspace-fg)]"
            >
              {row.title}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
              Current: {statusLabel(row.status)}
            </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--workspace-muted-fg)]">
            Due date
          </label>
          <input
            type="date"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-fg)_04%,transparent)] px-3 py-2 text-[13px] text-[var(--workspace-fg)] outline-none"
          />
          <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
            Updates your deadline for admins on the org tracker.
          </p>

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--workspace-muted-fg)]">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Context for your lead — blocker, ETA, dependency…"
            rows={3}
            className="mt-2 w-full resize-y rounded-xl border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-fg)_04%,transparent)] px-3 py-2 text-[13px] leading-relaxed text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] outline-none"
          />

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--workspace-muted-fg)]">
            Status
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {statusButtons.map(({ key, label, className }) => (
              <button
                key={key}
                type="button"
                disabled={saving}
                onClick={() => void apply(key)}
                className={`route5-pressable rounded-xl border px-3 py-2.5 text-[12px] font-semibold disabled:opacity-50 ${className}`}
              >
                {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : label}
              </button>
            ))}
          </div>

          {error ? <p className="mt-3 text-[12px] text-amber-200">{error}</p> : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveDeadlineAndNoteOnly()}
            className="route5-pressable mt-4 w-full rounded-xl border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-fg)_06%,transparent)] py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] hover:bg-[color-mix(in_srgb,var(--workspace-fg)_10%,transparent)] disabled:opacity-50"
          >
            Save due date &amp; note only
          </button>

          {canLead ? (
            <Link
              href="/workspace/commitments"
              className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--workspace-accent)] hover:underline"
              onClick={onClose}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open org commitments (full editor)
            </Link>
          ) : (
            <p className="mt-4 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Your lead sees these updates on the org tracker and in notifications.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

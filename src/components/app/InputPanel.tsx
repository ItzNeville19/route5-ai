"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { EXTRACTION_PRESETS, type ExtractionPreset } from "@/lib/extraction-presets";
import { inputDraftKey } from "@/lib/workspace-prefs";

const MAX_CHARS = 100_000;

type Props = {
  projectId: string;
  onExtracted: () => void;
  /** One-shot prefill (e.g. from Linear/GitHub bridge) */
  prefillText?: string | null;
  onPrefillConsumed?: () => void;
};

export default function InputPanel({
  projectId,
  onExtracted,
  prefillText,
  onPrefillConsumed,
}: Props) {
  const { open: openPalette } = useCommandPalette();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<false | "ai" | "offline">(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerId = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(inputDraftKey(projectId));
      setText(saved ?? "");
    } catch {
      setText("");
    }
  }, [projectId]);

  useEffect(() => {
    if (!prefillText?.trim()) return;
    setText(prefillText);
    onPrefillConsumed?.();
    window.setTimeout(() => taRef.current?.focus(), 0);
  }, [prefillText, onPrefillConsumed]);

  useEffect(() => {
    if (saveTimerId.current !== null) window.clearTimeout(saveTimerId.current);
    saveTimerId.current = window.setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(inputDraftKey(projectId), text);
        else localStorage.removeItem(inputDraftKey(projectId));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => {
      if (saveTimerId.current !== null) window.clearTimeout(saveTimerId.current);
    };
  }, [text, projectId]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(false), 5000);
    return () => window.clearTimeout(t);
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawInput = text.trim();
    if (!rawInput) {
      setError("Paste some text to analyze.");
      return;
    }
    setError(null);
    setSuccess(false as const);
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ projectId, rawInput }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        mode?: "ai" | "offline";
      };
      if (!res.ok) {
        setError(data.error ?? "Processing failed.");
        return;
      }
      setText("");
      try {
        localStorage.removeItem(inputDraftKey(projectId));
      } catch {
        /* ignore */
      }
      setSuccess(data.mode === "offline" ? "offline" : "ai");
      onExtracted();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const len = text.length;
  const overLimit = len > MAX_CHARS;

  function applyPreset(p: ExtractionPreset) {
    setText((t) => {
      const cur = t.trim();
      return cur ? `${cur}\n\n---\n\n${p.body}` : p.body;
    });
    window.setTimeout(() => taRef.current?.focus(), 0);
  }

  return (
    <section className="glass-liquid rounded-2xl border border-white/50 shadow-sm">
      <form onSubmit={handleSubmit} className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--workspace-muted-fg)]">
            Templates
          </span>
          {EXTRACTION_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.use}
              onClick={() => applyPreset(p)}
              className="rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="relative rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or build from a template — 100k max."
            rows={8}
            disabled={loading}
            aria-invalid={!!error || overLimit}
            className="w-full resize-y rounded-lg bg-transparent px-4 pb-14 pt-4 text-[15px] leading-relaxed text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/20 disabled:opacity-60"
          />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => openPalette()}
              className="rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]"
              aria-label="Open command palette"
            >
              ⌘K
            </button>
            <p className="text-[11px] text-[var(--workspace-muted-fg)]">Server keys</p>
          </div>
        </div>

        <div
          className={`mt-2 flex justify-end text-[11px] tabular-nums ${
            overLimit ? "text-[var(--workspace-fg)]" : "text-[var(--workspace-muted-fg)]"
          }`}
        >
          {len.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </div>

        {loading ? (
          <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]" aria-live="polite">
            Processing…
          </p>
        ) : null}

        {error && (
          <div
            className="mt-4 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] text-[var(--workspace-fg)]"
            role="status"
          >
            {error}
          </div>
        )}

        {success && !error && (
          <div
            className="mt-4 flex gap-2 rounded-lg border border-indigo-200/80 bg-indigo-50/90 px-3 py-2.5 text-[13px] text-indigo-950"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--workspace-accent)]" />
            <span>
              {success === "offline"
                ? "Saved — heuristic digest. Full AI extraction when your workspace has intelligence enabled."
                : "Saved."}
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || overLimit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--workspace-accent)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--workspace-accent-hover)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Processing…
              </>
            ) : (
              "Run extraction"
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              document.getElementById("extractions-section")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
          >
            Jump to extractions
          </button>
          <Link
            href="/projects"
            className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
          >
            All projects
          </Link>
        </div>
      </form>
    </section>
  );
}

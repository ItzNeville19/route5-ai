"use client";

import { useState } from "react";
import { Check, Copy, CopyPlus, Download, Loader2 } from "lucide-react";
import {
  extractionMarkdownFilename,
  extractionToMarkdown,
} from "@/lib/extraction-markdown";
import { isHeuristicExtractionSummary } from "@/lib/extraction-mode";
import type { Extraction } from "@/lib/types";
import ExtractionWorkFrame from "@/components/app/ExtractionWorkFrame";

type Props = {
  projectId: string;
  extraction: Extraction;
  onUpdated: (next: Extraction) => void;
  selected?: boolean;
  onSelect?: () => void;
  onDuplicated?: () => void;
};

export default function ExtractionCard({
  projectId,
  extraction,
  onUpdated,
  selected,
  onSelect,
  onDuplicated,
}: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);
  const [duping, setDuping] = useState(false);

  async function duplicateRun() {
    setErr(null);
    setDuping(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/extractions/${extraction.id}/duplicate`,
        { method: "POST", credentials: "same-origin" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Duplicate failed.");
        return;
      }
      onDuplicated?.();
    } catch {
      setErr("Duplicate failed.");
    } finally {
      setDuping(false);
    }
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(extractionToMarkdown(extraction));
      setCopiedMd(true);
      window.setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      setErr("Could not copy to clipboard.");
    }
  }

  function downloadMarkdown() {
    try {
      const md = extractionToMarkdown(extraction);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = extractionMarkdownFilename(extraction);
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Could not download file.");
    }
  }

  const created = new Date(extraction.createdAt);
  const heuristicRun = isHeuristicExtractionSummary(extraction.summary);

  async function toggleItem(itemId: string, completed: boolean) {
    setErr(null);
    setSavingId(itemId);
    const next = extraction.actionItems.map((a) =>
      a.id === itemId ? { ...a, completed } : a
    );
    try {
      const res = await fetch(
        `/api/projects/${projectId}/extractions/${extraction.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ actionItems: next }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        actionItems?: Extraction["actionItems"];
      };
      if (!res.ok) {
        setErr(data.error ?? "Could not update.");
        return;
      }
      if (data.actionItems) {
        onUpdated({
          ...extraction,
          actionItems: data.actionItems,
        });
      }
    } catch {
      setErr("Could not update status.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <article
      id={`ex-${extraction.id}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={`rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-sm sm:p-6 ${
        onSelect
          ? "cursor-pointer transition hover:border-[var(--workspace-accent)]/35"
          : ""
      } ${selected ? "ring-2 ring-[var(--workspace-accent)]/30" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--workspace-border)] pb-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--workspace-muted-fg)]">
            Saved run
          </span>
          {heuristicRun ? (
            <span
              className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200"
              title="No LLM on this deployment — pattern-based digest. Configure OPENAI_API_KEY for AI structuring."
            >
              Heuristic
            </span>
          ) : (
            <span
              className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200"
              title="Structured extraction returned by the configured model"
            >
              AI
            </span>
          )}
          <time
            dateTime={created.toISOString()}
            className="text-[12px] text-[var(--workspace-muted-fg)]"
          >
            {created.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        </div>
        <div className="flex flex-wrap gap-2">
          {onDuplicated ? (
            <button
              type="button"
              disabled={duping}
              title="Create a new extraction with the same content and structure in this project"
              onClick={(e) => {
                e.stopPropagation();
                void duplicateRun();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-surface)] disabled:opacity-50"
            >
              {duping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" aria-hidden />
              ) : (
                <CopyPlus className="h-3.5 w-3.5 opacity-70" aria-hidden />
              )}
              Duplicate
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void copyMarkdown();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-surface)]"
          >
            {copiedMd ? (
              <Check className="h-3.5 w-3.5 text-[var(--workspace-accent)]" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5 opacity-70" aria-hidden />
            )}
            {copiedMd ? "Copied" : "Markdown"}
          </button>
          <button
            type="button"
            title="Download run as a .md file for email or contract files"
            onClick={(e) => {
              e.stopPropagation();
              downloadMarkdown();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-surface)]"
          >
            <Download className="h-3.5 w-3.5 opacity-70" aria-hidden />
            Download
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <ExtractionWorkFrame extraction={extraction} />
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
            Snapshot
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
            {extraction.summary || "—"}
          </p>
        </div>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
            Decisions
          </h3>
          {extraction.decisions.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">
              None identified
            </p>
          ) : (
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-[14px] text-[var(--workspace-fg)]">
              {extraction.decisions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
            Action items
          </h3>
          {extraction.actionItems.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">
              None identified
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {extraction.actionItems.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={a.completed}
                    disabled={savingId === a.id}
                    onChange={(e) =>
                      void toggleItem(a.id, e.target.checked)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 rounded border-[var(--workspace-border)] text-[var(--workspace-accent)] focus:ring-[var(--workspace-accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[14px] leading-snug ${
                        a.completed
                          ? "text-[var(--workspace-muted-fg)] line-through"
                          : "text-[var(--workspace-fg)]"
                      }`}
                    >
                      {a.text}
                    </p>
                    {a.owner && (
                      <p className="mt-0.5 text-[12px] text-[var(--workspace-muted-fg)]">
                        Owner: {a.owner}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {err && (
        <p className="mt-3 text-[13px] text-[var(--workspace-danger-fg)]" role="alert">
          {err}
        </p>
      )}
    </article>
  );
}

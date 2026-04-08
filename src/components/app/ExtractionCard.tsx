"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Extraction } from "@/lib/types";

type Props = {
  projectId: string;
  extraction: Extraction;
};

export default function ExtractionCard({ projectId, extraction }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const created =
    extraction.createdAt?.toDate?.() ?? new Date();

  async function toggleItem(itemId: string, completed: boolean) {
    setErr(null);
    setSavingId(itemId);
    const ref = doc(
      db(),
      "projects",
      projectId,
      "extractions",
      extraction.id
    );
    const next = extraction.actionItems.map((a) =>
      a.id === itemId ? { ...a, completed } : a
    );
    try {
      await updateDoc(ref, { actionItems: next });
    } catch {
      setErr("Could not update status.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <article className="rounded-2xl border border-[var(--border-dark)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-dark)] pb-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted-light)]">
          Extraction
        </span>
        <time
          dateTime={created.toISOString()}
          className="text-[12px] text-[var(--text-muted-light)]"
        >
          {created.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </time>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted-light)]">
            Summary
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-light)]">
            {extraction.summary || "—"}
          </p>
        </div>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted-light)]">
            Decisions
          </h3>
          {extraction.decisions.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--text-muted-light)]">
              None identified
            </p>
          ) : (
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-[14px] text-[var(--text-light)]">
              {extraction.decisions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted-light)]">
            Action items
          </h3>
          {extraction.actionItems.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--text-muted-light)]">
              None identified
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {extraction.actionItems.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg bg-[var(--bg-dark)]/50 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={a.completed}
                    disabled={savingId === a.id}
                    onChange={(e) =>
                      void toggleItem(a.id, e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-[var(--border-dark)] text-[var(--blue)] focus:ring-[var(--blue)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[14px] leading-snug ${
                        a.completed
                          ? "text-[var(--text-muted-light)] line-through"
                          : "text-[var(--text-light)]"
                      }`}
                    >
                      {a.text}
                    </p>
                    {a.owner && (
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted-light)]">
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
        <p className="mt-3 text-[13px] text-red-400" role="alert">
          {err}
        </p>
      )}
    </article>
  );
}

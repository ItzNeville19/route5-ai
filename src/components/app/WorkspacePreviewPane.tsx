"use client";

import type { Extraction } from "@/lib/types";
import ExtractionWorkFrame from "@/components/app/ExtractionWorkFrame";

type Props = {
  projectName: string;
  projectIconEmoji?: string | null;
  extractions: Extraction[];
  selectedId: string | null;
};

/** Focused preview of the selected extraction — no decorative “browser” chrome. */
export default function WorkspacePreviewPane({
  projectName,
  projectIconEmoji,
  extractions,
  selectedId,
}: Props) {
  const selected =
    extractions.find((e) => e.id === selectedId) ?? extractions[0] ?? null;

  return (
    <aside className="flex max-h-[min(80vh,calc(100dvh-8rem))] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] shadow-sm xl:sticky xl:top-28 xl:max-w-[400px] xl:shrink-0">
      <div className="shrink-0 border-b border-[var(--workspace-border)] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
          Preview
        </p>
        <p className="mt-0.5 truncate text-[15px] font-semibold text-[var(--workspace-fg)]">
          {projectIconEmoji?.trim() ? (
            <span className="mr-1.5 inline-block" aria-hidden>
              {projectIconEmoji.trim()}
            </span>
          ) : null}
          {projectName}
        </p>
        <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">Click a run in the list.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!selected ? (
          <div className="rounded-lg border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-10 text-center">
            <p className="text-[12px] text-[var(--workspace-muted-fg)]">Select a run.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <ExtractionWorkFrame extraction={selected} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                Snapshot
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--workspace-fg)]">
                {selected.summary || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                Decisions
              </p>
              {selected.decisions.length === 0 ? (
                <p className="mt-1.5 text-[13px] text-[var(--workspace-muted-fg)]">None</p>
              ) : (
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-[13px] text-[var(--workspace-fg)]">
                  {selected.decisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                Action items
              </p>
              <ul className="mt-1.5 space-y-2">
                {selected.actionItems.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[12px] text-[var(--workspace-fg)]"
                  >
                    {a.completed ? (
                      <span className="text-[var(--workspace-muted-fg)] line-through">{a.text}</span>
                    ) : (
                      a.text
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

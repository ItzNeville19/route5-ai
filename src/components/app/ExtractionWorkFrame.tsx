import type { Extraction } from "@/lib/types";

/**
 * Problem / path / unknowns — shown before the short snapshot so runs feel execution-led.
 */
export default function ExtractionWorkFrame({ extraction }: { extraction: Extraction }) {
  const hasProblem = Boolean(extraction.problem?.trim());
  const hasSolution = Boolean(extraction.solution?.trim());
  const hasQuestions = extraction.openQuestions?.length > 0;
  if (!hasProblem && !hasSolution && !hasQuestions) return null;

  return (
    <div className="space-y-4 rounded-xl border border-[var(--workspace-accent)]/20 bg-[var(--workspace-accent)]/[0.06] px-4 py-4">
      {hasProblem ? (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-accent)]">
            Problem
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-fg)]">{extraction.problem}</p>
        </div>
      ) : null}
      {hasSolution ? (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-accent)]">
            Path forward
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-fg)]">{extraction.solution}</p>
        </div>
      ) : null}
      {hasQuestions ? (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
            Open questions
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-[14px] text-[var(--workspace-fg)]">
            {extraction.openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

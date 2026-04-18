/** Detect offline/heuristic captures from persisted summary text (no DB column yet). */
export function isHeuristicExtractionSummary(summary: string): boolean {
  const s = summary.trimStart();
  return (
    s.startsWith("AI summary") ||
    s.startsWith("Heuristic digest") ||
    s.startsWith("Heuristic run") ||
    s === "No text was provided."
  );
}

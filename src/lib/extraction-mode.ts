/** Detect offline/heuristic runs from persisted summary text (no DB column yet). */
export function isHeuristicExtractionSummary(summary: string): boolean {
  const s = summary.trimStart();
  return s.startsWith("Heuristic digest") || s === "No text was provided.";
}

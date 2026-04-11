import type { ExtractionModelResult } from "@/lib/ai/schema";

/**
 * Builds a structured extraction without calling an LLM — used when AI
 * extraction isn’t enabled so projects and the UI still work end-to-end.
 */
export function buildOfflineExtraction(rawInput: string): ExtractionModelResult {
  const text = rawInput.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return {
      summary: "No text was provided.",
      decisions: [],
      actionItems: [{ text: "Paste content to generate a digest." }],
    };
  }

  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const firstBlock = paragraphs[0] ?? text;
  const summaryBody =
    firstBlock.length > 900 ? `${firstBlock.slice(0, 897)}…` : firstBlock;

  const summary =
    "Heuristic digest (full AI structuring runs when your workspace has intelligence enabled).\n\n" +
    summaryBody;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const bulletLike = lines.filter(
    (l) =>
      /^[-*•]\s+/.test(l) ||
      /^\d+\.\s+/.test(l) ||
      /^[a-z]\)\s+/i.test(l)
  );

  const stripBullet = (l: string) =>
    l
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/^[a-z]\)\s+/i, "")
      .slice(0, 500);

  let decisions =
    bulletLike.length > 0
      ? bulletLike.slice(0, 10).map(stripBullet).filter(Boolean)
      : lines
          .filter((l) => l.length >= 24 && l.length <= 400)
          .slice(0, 6)
          .map((l) => l.slice(0, 500));

  if (decisions.length === 0) {
    const head = lines[0];
    if (head) decisions = [head.slice(0, 400)];
  }

  const taskish = /^(todo|fixme|action|next)\s*:/i;
  const checkbox = /^\[[ x]\]\s+/i;
  const taskLines = lines.filter(
    (l) => taskish.test(l) || checkbox.test(l) || /^[-*]\s*\[[ x]\]/i.test(l)
  );

  const actionItems =
    taskLines.length > 0
      ? taskLines.slice(0, 15).map((l) => ({ text: l.slice(0, 500) }))
      : [
          {
            text: "Review this digest and refine notes; enable AI extraction in your deployment for automated structuring.",
          },
        ];

  return { summary, decisions, actionItems };
}

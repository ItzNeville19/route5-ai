import type { ExtractionModelResult } from "@/lib/ai/schema";

const HEURISTIC_TAG =
  "AI summary — enable AI decision capture on your deployment for clearer problem and path detail.\n\n";

/**
 * Builds a structured extraction without calling an LLM — used when AI
 * extraction isn’t enabled so projects and the UI still work end-to-end.
 */
export function buildOfflineExtraction(rawInput: string): ExtractionModelResult {
  const text = rawInput.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return {
      summary: HEURISTIC_TAG + "No text was provided.",
      problem: "Nothing to analyze.",
      solution: "Paste notes, a ticket, or a thread, then capture again.",
      openQuestions: [],
      decisions: [],
      actionItems: [{ text: "Paste content to generate a structured process." }],
    };
  }

  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const firstBlock = paragraphs[0] ?? text;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questionLines = lines.filter((l) => l.includes("?")).slice(0, 8);
  const openQuestions = questionLines.map((l) => (l.length > 320 ? `${l.slice(0, 317)}…` : l));

  const tension =
    /\b(issue|blocker|risk|delay|deadline|broken|fails?|stuck|urgent|incident|outage|regression)\b/i;
  const problemGuess = lines.find((l) => tension.test(l) && l.length >= 12);
  const problem =
    problemGuess?.slice(0, 600) ??
    (firstBlock.length > 420 ? `${firstBlock.slice(0, 417)}…` : firstBlock);

  const pathish =
    /\b(should|recommend|propose|decided|will\s+do|next\s+step|mitigation|fix|roll\s*back|ship|launch)\b/i;
  const pathLines = lines.filter((l) => pathish.test(l) && l.length >= 16).slice(0, 4);
  const solution =
    pathLines.length > 0
      ? pathLines.map((l) => (l.length > 400 ? `${l.slice(0, 397)}…` : l)).join("\n\n")
      : "No clear recommended path was detected in the text — add a decision or owner, or enable AI extraction for a stronger read.";

  const summary =
    HEURISTIC_TAG +
    (firstBlock.length > 360 ? `${firstBlock.slice(0, 357)}…` : firstBlock);

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
            text: "Tighten the problem statement in your notes, then capture again — or enable AI decision capture for structured problem, path, and actions.",
          },
        ];

  return { summary, problem, solution, openQuestions, decisions, actionItems };
}

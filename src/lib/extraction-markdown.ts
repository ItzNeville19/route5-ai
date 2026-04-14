import type { Extraction } from "@/lib/types";

/** Safe filename for downloads (ASCII, no path chars). */
export function extractionMarkdownFilename(ex: Extraction): string {
  const stamp = new Date(ex.createdAt).toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return `route5-run-${stamp}-${ex.id.slice(0, 8)}.md`;
}

/** Markdown export for sharing / downstream tools. */
export function extractionToMarkdown(ex: Extraction): string {
  const lines: string[] = [];
  lines.push(`# Extraction · ${new Date(ex.createdAt).toISOString()}`);
  lines.push("");
  if (ex.problem?.trim()) {
    lines.push("## Problem");
    lines.push(ex.problem.trim());
    lines.push("");
  }
  if (ex.solution?.trim()) {
    lines.push("## Path forward");
    lines.push(ex.solution.trim());
    lines.push("");
  }
  if (ex.openQuestions?.length) {
    lines.push("## Open questions");
    for (const q of ex.openQuestions) {
      lines.push(`- ${q}`);
    }
    lines.push("");
  }
  lines.push("## Snapshot");
  lines.push(ex.summary?.trim() || "_None_");
  lines.push("");
  lines.push("## Decisions");
  if (ex.decisions.length === 0) {
    lines.push("_None_");
  } else {
    for (const d of ex.decisions) {
      lines.push(`- ${d}`);
    }
  }
  lines.push("");
  lines.push("## Action items");
  if (ex.actionItems.length === 0) {
    lines.push("_None_");
  } else {
    for (const a of ex.actionItems) {
      const box = a.completed ? "[x]" : "[ ]";
      lines.push(`${box} ${a.text}${a.owner ? ` _(owner: ${a.owner})_` : ""}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

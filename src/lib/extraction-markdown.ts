import type { Extraction } from "@/lib/types";

/** Markdown export for sharing / downstream tools. */
export function extractionToMarkdown(ex: Extraction): string {
  const lines: string[] = [];
  lines.push(`# Extraction · ${new Date(ex.createdAt).toISOString()}`);
  lines.push("");
  lines.push("## Summary");
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

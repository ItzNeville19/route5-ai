export type ActionItemInput = {
  text: string;
  owner?: string | null;
};

/** Model output before we assign ids and completed flags. */
export type ExtractionModelResult = {
  summary: string;
  decisions: string[];
  actionItems: ActionItemInput[];
};

export type ActionItemStored = {
  id: string;
  text: string;
  owner?: string | null;
  completed: boolean;
};

const MAX_RAW_INPUT = 100_000;

export function parseExtractionJson(raw: string): ExtractionModelResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model returned invalid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model JSON must be an object");
  }
  const o = parsed as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary : "";
  const decisions = Array.isArray(o.decisions)
    ? o.decisions.filter((d): d is string => typeof d === "string")
    : [];
  const actionItemsRaw = Array.isArray(o.actionItems) ? o.actionItems : [];
  const actionItems: ActionItemInput[] = actionItemsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const text = typeof r.text === "string" ? r.text.trim() : "";
      if (!text) return null;
      const owner =
        r.owner === null || r.owner === undefined
          ? undefined
          : typeof r.owner === "string"
            ? r.owner.trim() || null
            : null;
      return { text, owner: owner ?? undefined } as ActionItemInput;
    })
    .filter((x): x is ActionItemInput => x !== null);

  return { summary, decisions, actionItems };
}

export function clampRawInput(raw: string): string {
  if (raw.length <= MAX_RAW_INPUT) return raw;
  return raw.slice(0, MAX_RAW_INPUT);
}

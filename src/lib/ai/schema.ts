export type ActionItemInput = {
  text: string;
  owner?: string | null;
};

/** Model output before we assign ids and completed flags. */
export type ExtractionModelResult = {
  summary: string;
  /** What is broken, at risk, or unclear — distinct from paraphrasing the paste. */
  problem: string;
  /** How to resolve it or what to decide between — execution-oriented. */
  solution: string;
  openQuestions: string[];
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
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const problem = typeof o.problem === "string" ? o.problem.trim() : "";
  const solution = typeof o.solution === "string" ? o.solution.trim() : "";
  const openQuestionsRaw = Array.isArray(o.openQuestions) ? o.openQuestions : [];
  const openQuestions = openQuestionsRaw
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 12);
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

  return { summary, problem, solution, openQuestions, decisions, actionItems };
}

export function parseOpenQuestionsFromDbJson(text: string): string[] {
  try {
    const raw = JSON.parse(text) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

/** Supabase jsonb array or SQLite JSON string. */
export function parseOpenQuestionsField(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof raw === "string") return parseOpenQuestionsFromDbJson(raw);
  return [];
}

export function clampRawInput(raw: string): string {
  if (raw.length <= MAX_RAW_INPUT) return raw;
  return raw.slice(0, MAX_RAW_INPUT);
}

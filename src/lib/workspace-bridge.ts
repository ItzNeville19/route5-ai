/** Browser session bridge: integrations → project extraction field. */

export const ROUTE5_DRAFT_KEY = "route5:extractionDraft";

export type ExtractionDraftPayload = {
  body: string;
  source: string;
  createdAt: string;
};

export function writeExtractionDraft(body: string, source: string): void {
  if (typeof window === "undefined") return;
  const payload: ExtractionDraftPayload = {
    body,
    source,
    createdAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(ROUTE5_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function peekExtractionDraft(): ExtractionDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROUTE5_DRAFT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<ExtractionDraftPayload>;
    if (typeof o.body !== "string" || !o.body.trim()) return null;
    return {
      body: o.body,
      source: typeof o.source === "string" ? o.source : "import",
      createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearExtractionDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ROUTE5_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function consumeExtractionDraft(): ExtractionDraftPayload | null {
  const d = peekExtractionDraft();
  if (d) clearExtractionDraft();
  return d;
}

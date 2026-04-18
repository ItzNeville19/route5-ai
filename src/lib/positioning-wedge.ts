/**
 * Primary positioning — execution layer above Slack, Notion, email, and docs.
 * Used across marketing, Guides, and in-app mission copy. Does not change API shapes.
 */

/** Default Desk template (client/program delivery). */
export const DEFAULT_DESK_PRESET_ID = "client-program" as const;

export const POSITIONING_WEDGE = {
  id: "execution-layer" as const,
  /** Short label for headers and kickers */
  label: "Execution layer",
  /** Who we speak to first in sales and marketing */
  buyerRoles: [
    "C-suite and COOs who own operational outcomes",
    "Mid-market companies (~50–500 employees) where execution breakdown costs money",
    "Finance, law, consulting, and operations-heavy teams",
  ] as const,
  /**
   * Buyer-safe promise — persistent accountability state, not “another summary.”
   */
  buyerSafePromise:
    "Route5 converts decisions into owned, tracked commitments—persistent accountability state so leadership always knows what was decided, who owns it, and whether it is happening.",
  /** Sidebar / hero — one line */
  taglineShort:
    "The execution layer above your stack—decisions become owned commitments with persistent accountability.",
  /** One line for PRODUCT_HONEST / mission */
  productOneLine:
    "Route5.ai is an enterprise execution layer: it turns decisions from meetings, threads, and documents into owned, tracked commitments—so nothing falls through the cracks between tools.",
  /** Subtle — discipline of execution */
  qualityBar:
    "Not a task manager or summarizer—a system of record for who owes what, with health you can read from real state.",
  /** Shark-style closer — qualify “real time” as in-app execution state, not omnichannel firehose */
  sharkOneLine:
    "Route5 sits above Slack, Notion, and email as the layer that enforces execution—persistent accountability from decision to done.",
} as const;

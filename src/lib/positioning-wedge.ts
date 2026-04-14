/**
 * Primary go-to-market wedge — one focused buyer group (contract & program operations).
 * Used across marketing, Guides, and in-app mission copy. Does not change API shapes.
 */

/** Default Desk template for the contract & program operations wedge (QBR / escalation / commitments). */
export const DEFAULT_DESK_PRESET_ID = "client-program" as const;

export const POSITIONING_WEDGE = {
  id: "contract-program-ops" as const,
  /** Short label for headers and kickers */
  label: "Contract & program operations",
  /** Who we speak to first in sales and marketing */
  buyerRoles: [
    "Regional and program operations leads",
    "Account directors and client delivery",
    "Heads of multi-site or contract services delivery",
  ] as const,
  /**
   * Buyer-safe promise — execution hygiene, not “AI magic.”
   * (Aligned with B2B wedge plan; honest about what the product stores.)
   */
  buyerSafePromise:
    "Route5 turns messy operational text into owned next steps per client or program, with a checklist and history your team can't lose in chat — and dashboards from what people actually complete.",
  /** Sidebar / hero — one line */
  taglineShort:
    "Commitment operations: owned next steps per program — proof in your workspace data.",
  /** One line for PRODUCT_HONEST / mission */
  productOneLine:
    "Route5 is a commitment workspace for program and client delivery: messy notes in, owned next steps and checklists out — saved per project, measurable on Overview.",
  /** Subtle — not claiming F500; describes bar */
  qualityBar:
    "Built for the discipline of execution: audit-friendly history, named owners, and completion metrics — not a disposable chat.",
} as const;

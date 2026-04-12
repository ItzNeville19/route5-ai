/**
 * Marketing / advertising hygiene — copy blocks used on public and in-app surfaces.
 * This is not legal advice; it aligns UI with how the product is actually built.
 */

export const ADVERTISING_DISCLOSURES = {
  /** One line for footers and compact strips */
  aiHumanReview: "AI-assisted outputs are not a substitute for human judgment on operational decisions.",

  /**
   * Pricing & plans — placed near tier grids. States: no binding offer, billing gate,
   * integration reality, per-account data.
   */
  plansGrid:
    "Limits and features describe the in-app product as shipped today. Workspace data is per signed-in account unless your contract says otherwise. Integrations require API credentials or manual flows where each integration page explains. Multi-seat org controls and some connectors may be roadmap — see What we ship. Set NEXT_PUBLIC_BILLING_LIVE=1 when you are commercially open; Subscribe-style CTAs may still route through Contact until card checkout is integrated. Marketing pages are not a binding offer; your order, MSA, or Terms control.",

  /** Shorter variant for secondary placement */
  plansShort:
    "Not a binding offer. Checkout when billing is enabled; integrations need tokens or paste as documented. Data is per account unless contracted otherwise.",

  /** Account / Settings plans intro */
  accountPlans:
    "Plan descriptions summarize packaging. Usage limits are enforced in-app. You are not charged through self-serve checkout until billing is enabled and you complete purchase.",

  /** Product page strip */
  productFooter:
    "Route5 does not run autonomous actions in Linear, GitHub, Slack, or other tools without your setup. “Execution intelligence” here means structured extractions, stored projects, checklists, and metrics from your data — not guaranteed business outcomes.",
} as const;

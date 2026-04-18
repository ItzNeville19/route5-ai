/**
 * Plan definitions for marketing and in-app account pages.
 * Limits are enforced server-side (`entitlements`, `/api/extract`, `/api/projects`).
 *
 * `NEXT_PUBLIC_BILLING_LIVE=1` — commercial packaging is “on” (Subscribe CTAs, etc.).
 * Self-serve card checkout is a separate integration when you add Stripe; until then,
 * paid tiers still route through Contact as implemented in `PublicPlansGrid` / Account.
 */
export const BILLING_LIVE = process.env.NEXT_PUBLIC_BILLING_LIVE === "1";

export type PlanTierId = "free" | "pro" | "ultra" | "enterprise";

export type PlanTier = {
  id: PlanTierId;
  name: string;
  price: string;
  /** Short positioning line under the price — accurate and forward-looking. */
  valueNote: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

export const PLAN_TIERS: PlanTier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    valueNote:
      "Try Route5 with tight limits — enough to evaluate Desk and projects; upgrade for real volume and connectors.",
    tagline: "Evaluation tier — small limits on purpose.",
    features: [
      "3 projects · 60 captured decisions / month (UTC) — see Settings for live usage",
      "Desk, Overview, Reports — core execution loop",
      "Linear & GitHub: paste/import as documented (tokens optional for live API)",
      "Team insights: roll-up counts for your signed-in account — not multi-seat collaboration",
      "Slack connector: Pro tier (see integration page for token requirements)",
    ],
    cta: "Included today",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    valueNote:
      "Where daily execution work belongs: higher ceilings, Slack connector, full exports, and priority support.",
    tagline: "Higher limits for people who capture decisions every week (not a shared org database).",
    features: [
      "30 projects · 4,000 captured decisions / month — room for real cadence",
      "Slack: integration page + API as documented (host tokens may be required)",
      "Reports exports (JSON, print, SVG charts) and analytics from your saved commitments",
      "Priority support and early connector betas — subject to availability",
      "Team insights: Pro packaging (exports + messaging) — data stays per signed-in user",
    ],
    cta: BILLING_LIVE ? "Subscribe" : "Get Pro",
    highlighted: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$79",
    valueNote:
      "Higher caps for heavy usage. SSO / deep org features may be roadmap — confirmed in sales.",
    tagline: "Heavy usage and roadmap enterprise features — confirm scope before buying.",
    features: [
      "120 projects · 25,000 captured decisions / month (UTC)",
      "Everything in Pro with substantially higher limits",
      "SSO / SAML and org controls — roadmap; timeline in your sales conversation",
      "Org-wide analytics — prioritized for Ultra where we ship them (not guaranteed dates)",
      "Success check-ins for larger rollouts — by mutual agreement",
    ],
    cta: "Talk to us",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    valueNote:
      "Contracted high limits and paper — not unconstrained global scale; exact terms in your order or MSA.",
    tagline: "Procurement, security review, and custom terms — by contract.",
    features: [
      "Very high in-app limits — exact caps in your order / MSA (not infinite usage)",
      "Security questionnaire and DPA path — subject to mutual agreement",
      "Retention, export, VPC / BYO — negotiated; roadmap features identified in diligence",
      "Invoice, NET terms, rollout — as stated in your contract",
    ],
    cta: "Contact",
  },
];

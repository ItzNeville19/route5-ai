/**
 * Plan definitions for marketing and in-app account pages.
 * Limits are enforced server-side (`entitlements`, `/api/extract`, `/api/projects`).
 * `BILLING_LIVE` gates Stripe checkout UI only — usage caps apply regardless.
 */
export const BILLING_LIVE = false;

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
      "3 projects · 60 extractions / month (UTC) — see Settings for live usage",
      "Desk, Overview, Reports — core execution loop",
      "Linear & GitHub paste/import flows as shipped (same as Pro)",
      "Team insights (read-only snapshot) — upgrade for full connector treatment",
      "Slack connector locked — upgrade to Pro to unlock",
    ],
    cta: "Included today",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    valueNote:
      "Where daily execution work belongs: higher ceilings, Slack connector, full exports, and priority support.",
    tagline: "The sweet spot for individuals and small teams shipping every week.",
    features: [
      "30 projects · 4,000 extractions / month — room for real cadence",
      "Slack connector + integration page (paste today; tokens optional)",
      "Full Reports exports (JSON, print, SVG charts) and advanced analytics",
      "Priority support and early connector betas",
      "Team insights with full connector framing",
    ],
    cta: BILLING_LIVE ? "Subscribe" : "Get Pro",
    highlighted: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$79",
    valueNote:
      "Team-scale limits with SSO roadmap messaging, org analytics, and white-glove rollout language.",
    tagline: "For orgs coordinating execution across many projects.",
    features: [
      "120 projects · 25,000 extractions / month",
      "Everything in Pro with substantially higher limits",
      "SSO / SAML and org controls — we’ll align on roadmap",
      "Org-wide analytics and rollups (prioritized for Ultra)",
      "Dedicated success check-ins for larger rollouts",
    ],
    cta: "Talk to us",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    valueNote:
      "Unlimited caps in-app, procurement, security review, custom retention — how founder and Fortune-500 teams buy software.",
    tagline: "Volume, compliance, and deployment expectations at scale.",
    features: [
      "Unlimited projects & extractions in product limits",
      "Security questionnaire and DPA path",
      "Custom retention, export, and VPC / BYO conversations",
      "Invoice, NET terms, and dedicated rollout",
    ],
    cta: "Contact",
  },
];

/**
 * Public statistics shown on the marketing site. Each entry includes a primary source URL
 * so claims are verifiable (CEO / diligence friendly).
 */
export type MarketStat = {
  id: string;
  /** Animated numeric value (omit for text-only stats) */
  value?: number;
  /** String shown when no animation (e.g. range) */
  display?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  sourceLabel: string;
  sourceUrl: string;
};

/** @see https://www.gartner.com/en/newsroom/press-releases/2025-10-22-gartner-forecasts-worldwide-it-spending-to-grow-9-point-8-percent-in-2026-exceeding-6-trillion-dollars-for-the-first-time */
export const GARTNER_IT_SPEND_2026_URL =
  "https://www.gartner.com/en/newsroom/press-releases/2025-10-22-gartner-forecasts-worldwide-it-spending-to-grow-9-point-8-percent-in-2026-exceeding-6-trillion-dollars-for-the-first-time";

/** @see https://www.gao.gov/products/gao-25-107795 */
export const GAO_LEGACY_MODERNIZATION_URL =
  "https://www.gao.gov/products/gao-25-107795";

export const MARKET_STATS: readonly MarketStat[] = [
  {
    id: "global-it-2026",
    value: 6.08,
    prefix: "$",
    suffix: "T",
    decimals: 2,
    label: "Global IT spend (2026) — first year above $6T",
    sourceLabel: "Gartner Newsroom, Oct 2025",
    sourceUrl: GARTNER_IT_SPEND_2026_URL,
  },
  {
    id: "federal-legacy-om",
    value: 80,
    suffix: "%",
    decimals: 0,
    label: "Federal IT on ops & maintenance (legacy context)",
    sourceLabel: "U.S. Government Accountability Office",
    sourceUrl: GAO_LEGACY_MODERNIZATION_URL,
  },
  {
    id: "modernization-horizon",
    display: "3–5 yr",
    label: "Large legacy programs — typical horizon",
    sourceLabel: "U.S. GAO (agency legacy IT reports)",
    sourceUrl: GAO_LEGACY_MODERNIZATION_URL,
  },
];

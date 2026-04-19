/**
 * Route5 design system — Step 1: single source of truth for values shared with CSS.
 *
 * CSS custom properties are defined in `src/app/globals.css` under `--r5-*`.
 * Keep hex/spacing/duration values in sync when changing either file.
 *
 * Usage:
 * - CSS / Tailwind: `var(--r5-status-overdue)` or `bg-r5-status-overdue` (via @theme)
 * - TS / inline styles: import { R5_COLOR, r5 } from "@/lib/design-tokens"
 */

/** Semantic status — commitment health */
export const R5_COLOR = {
  statusOverdue: "#EF4444",
  statusAtRisk: "#F59E0B",
  statusOnTrack: "#3B82F6",
  statusCompleted: "#10B981",
  statusUnassigned: "#6B7280",
  /** Focus rings, links, Feed accents — matches workspace violet */
  accent: "#A78BFA",
} as const;

/** Dark shell surfaces (aligned with `.theme-route5-command` workspace) */
export const R5_SURFACE = {
  /** Main app background */
  primary: "#0a0a0a",
  /** Cards / panels — slightly elevated */
  secondary: "#171717",
  /** Hover affordance on rows and controls */
  hover: "rgba(255, 255, 255, 0.06)",
} as const;

export const R5_BORDER = {
  subtle: "rgba(255, 255, 255, 0.08)",
} as const;

/** Text on dark surfaces */
export const R5_TEXT = {
  primary: "#ffffff",
  /** gray-400 */
  secondary: "#9ca3af",
  /** gray-500 — tertiary labels */
  tertiary: "#6b7280",
} as const;

/** Typography scale — four sizes, two weights (plan) */
export const R5_FONT_SIZE = {
  /** body */
  body: "13px",
  /** subheading */
  subheading: "15px",
  /** heading */
  heading: "20px",
  /** display / hero numbers */
  display: "32px",
  /** Pulse KPIs, large numerals */
  metric: "2.35rem",
  /** Stat row numbers (Feed header) */
  stat: "20px",
  /** Uppercase section labels */
  caption: "11px",
  /** Keyboard hints */
  kbd: "10px",
} as const;

export const R5_FONT_WEIGHT = {
  regular: 400,
  semibold: 600,
} as const;

export const R5_LINE_HEIGHT = {
  body: 1.5,
  heading: 1.2,
} as const;

/** 4px base; only these multiples */
export const R5_SPACE = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export type R5SpaceKey = keyof typeof R5_SPACE;

/** Content gutters + shell (Step 2) + Feed (Step 3) */
export const R5_LAYOUT = {
  contentPaddingMobile: 16,
  contentPaddingDesktop: 24,
  /** Feed column max width (matches former max-w-4xl) */
  feedMaxWidth: 896,
  /** Approx. header + chrome for min-height calc on Feed */
  layoutChromeVertical: 96,
  /** Small menus anchored to rows */
  popoverMinWidth: 140,
  popoverMaxWidth: 280,
  /** Primary navigation rail */
  sidebarWidth: 220,
  /** Sticky workspace header */
  headerHeight: 44,
  /** Sidebar / mobile tab row item */
  navItemHeight: 36,
  /** Bottom tab bar on small viewports */
  mobileNavHeight: 64,
  /** Nav icon size (sidebar + tabs) */
  navIcon: 16,
} as const;

/** Border radius */
export const R5_RADIUS = {
  card: "8px",
  button: "6px",
  badge: "4px",
  pill: "999px",
  /** Inputs, small panels (≈ rounded-xl) */
  md: "12px",
  /** Commitment rows, modals (≈ rounded-2xl) */
  lg: "16px",
  /** Pulse / hero cards */
  pulse: "28px",
} as const;

/** Single elevated shadow token */
export const R5_SHADOW = {
  elevated: "0 4px 24px -8px rgba(0, 0, 0, 0.45)",
} as const;

/** Motion */
export const R5_DURATION = {
  fast: 120,
  normal: 200,
  slow: 350,
} as const;

/** Plan easing — all UI transitions */
export const R5_EASING = "cubic-bezier(0.16, 1, 0.3, 1)" as const;

/** CSS variable names (without `--`) for `var(--r5-…)` */
export const R5_CSS = {
  statusOverdue: "--r5-status-overdue",
  statusAtRisk: "--r5-status-at-risk",
  statusOnTrack: "--r5-status-on-track",
  statusCompleted: "--r5-status-completed",
  statusUnassigned: "--r5-status-unassigned",
  surfacePrimary: "--r5-surface-primary",
  surfaceSecondary: "--r5-surface-secondary",
  surfaceHover: "--r5-surface-hover",
  borderSubtle: "--r5-border-subtle",
  textPrimary: "--r5-text-primary",
  textSecondary: "--r5-text-secondary",
  textTertiary: "--r5-text-tertiary",
  sidebarWidth: "--r5-sidebar-width",
  headerHeight: "--r5-header-height",
  navItemHeight: "--r5-nav-item-height",
  mobileNavHeight: "--r5-mobile-nav-height",
  navIcon: "--r5-icon-nav",
  gapIconLabel: "--r5-gap-icon-label",
  accent: "--r5-accent",
  feedMaxWidth: "--r5-feed-max-width",
} as const;

/** `var(--r5-token-name)` helper for inline styles */
export function r5(token: keyof typeof R5_CSS): string {
  return `var(${R5_CSS[token]})`;
}

/** Flat export for tests and documentation */
export const DESIGN_TOKENS = {
  color: R5_COLOR,
  surface: R5_SURFACE,
  border: R5_BORDER,
  text: R5_TEXT,
  fontSize: R5_FONT_SIZE,
  fontWeight: R5_FONT_WEIGHT,
  lineHeight: R5_LINE_HEIGHT,
  space: R5_SPACE,
  layout: R5_LAYOUT,
  radius: R5_RADIUS,
  shadow: R5_SHADOW,
  duration: R5_DURATION,
  easing: R5_EASING,
} as const;

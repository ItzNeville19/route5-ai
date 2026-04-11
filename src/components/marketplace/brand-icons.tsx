import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/** Squircle clip — iOS-style icon mask inside callers apply via rounded-[22%] on wrapper */

export function IconRoute5({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#6366f1" />
      <path
        fill="white"
        opacity="0.95"
        d="M18 42V22l10 6 10-6v20l-10-6-10 6zm10-17v11l8-5v-11l-8 5z"
      />
    </svg>
  );
}

export function IconClerk({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#6C47FF" />
      <circle cx="32" cy="32" r="14" fill="white" opacity="0.95" />
    </svg>
  );
}

export function IconSupabase({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#3ECF8E" />
      <path
        fill="white"
        d="M42 18c-8 0-14 6-14 14v6H22v14h20c8 0 14-6 14-14V18h-14z"
        opacity="0.95"
      />
    </svg>
  );
}

export function IconOpenAI({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#6366f1" />
      <path
        fill="white"
        d="M32 18c-8 0-12 6-12 12 0 4 2 7 5 9-1 2-1 4 0 6l-2 8 8-4c2 1 4 1 6 0 2 3 5 5 9 5 8 0 12-6 12-12s-4-12-12-12c-2 0-4 1-6 2-2-5-7-8-13-8z"
        opacity="0.95"
      />
    </svg>
  );
}

export function IconSlack({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#4A154B" />
      <path fill="#E01E5A" d="M20 26a4 4 0 1 1 0-8h6v8h-6z" />
      <path fill="#36C5F0" d="M26 20v6h8v-6a4 4 0 1 0-8 0z" />
      <path fill="#2EB67D" d="M38 38h6a4 4 0 1 0 0-8h-6v8z" />
      <path fill="#ECB22E" d="M38 44v6a4 4 0 1 0 8 0v-6h-8z" />
    </svg>
  );
}

export function IconGitHub({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#181717" />
      <path
        fill="white"
        d="M32 18c-8 0-14 6-14 14 0 6 4 11 9 13 1 0 1-1 1-2v-2c-4 1-5-2-5-2-1-1-2-2-3-2h1c1 0 2 1 3 2 1 2 3 2 4 2 3 0 4-1 5-2 0 2 1 3 2 4-3 1-6 2-6 7 0 2 1 4 2 5-1 3 0 6 0 6 0 0 1 0 3-1 6-2 10-8 10-15 0-8-6-14-14-14z"
      />
    </svg>
  );
}

export function IconNotion({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#000" />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fill="white"
        fontSize="28"
        fontWeight="600"
        fontFamily="system-ui"
      >
        N
      </text>
    </svg>
  );
}

export function IconJira({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#0052CC" />
      <path
        fill="white"
        d="M38 22l-8 8-4-4-6 6 10 10 14-14-6-6z"
      />
    </svg>
  );
}

export function IconLinear({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#5E6AD2" />
      <path
        stroke="white"
        strokeWidth="4"
        fill="none"
        d="M20 40 L32 22 L44 40"
      />
    </svg>
  );
}

export function IconFigma({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#1E1E1E" />
      <circle cx="26" cy="24" r="8" fill="#F24E1E" />
      <circle cx="38" cy="24" r="8" fill="#FF7262" />
      <circle cx="26" cy="38" r="8" fill="#A259FF" />
      <path
        fill="#1ABCFE"
        d="M38 30a8 8 0 1 1 0 16h-8V30h8z"
      />
    </svg>
  );
}

export function IconGoogle({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="white" />
      <path fill="#4285F4" d="M32 26h12c-2-6-8-10-16-10a16 16 0 1 0 0 32c8 0 14-5 16-12H32v8h20v-20H32v8z" />
      <path fill="#EA4335" d="M18 30l-4 3c4 8 12 13 22 11l-3-8c-4 1-8 0-11-2z" />
      <path fill="#FBBC05" d="M22 42l-3 6c10 8 24 4 30-8h-16c-2 4-6 6-11 2z" />
      <path fill="#34A853" d="M32 46c5 0 9-2 12-5l-10-8c-2 2-5 3-8 3-6 0-11-4-13-10l-10 8c4 10 14 16 25 12z" />
    </svg>
  );
}

export function IconTeams({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#6264A7" />
      <rect x="16" y="20" width="16" height="20" rx="2" fill="white" />
      <circle cx="44" cy="28" r="8" fill="white" />
    </svg>
  );
}

export function IconSalesforce({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#00A1E0" />
      <path
        fill="white"
        d="M28 36c4 0 7-3 8-7 1-5-2-10-7-11s-10 2-12 7c-3-1-6 1-7 4-4 1-6 5-5 9s5 7 9 6c2 3 6 4 9 2z"
      />
    </svg>
  );
}

export function IconHubSpot({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#FF7A59" />
      <circle cx="32" cy="32" r="12" fill="white" />
    </svg>
  );
}

export function IconSnowflake({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#29B5E8" />
      <path
        stroke="white"
        strokeWidth="2"
        fill="none"
        d="M32 18v28M22 28l20 8M22 36l20-8"
      />
    </svg>
  );
}

export function IconConfluence({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#0052CC" />
      <path fill="white" d="M22 40l10-18 10 18H22z" />
    </svg>
  );
}

export function IconMcp({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#3d3d3d" />
      <path
        stroke="#a78bfa"
        strokeWidth="3"
        fill="none"
        d="M22 32h20M32 22v20"
      />
    </svg>
  );
}

export function IconSso({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#374151" />
      <circle cx="32" cy="28" r="8" stroke="white" strokeWidth="3" fill="none" />
      <path stroke="white" strokeWidth="3" fill="none" d="M20 44c0-6 6-10 12-10s12 4 12 10" />
    </svg>
  );
}

export function IconOnPrem({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#1f2937" />
      <rect x="18" y="22" width="28" height="22" rx="2" fill="none" stroke="#9ca3af" strokeWidth="2" />
      <path stroke="#9ca3af" strokeWidth="2" d="M24 34h16M28 28h8" />
    </svg>
  );
}

export function IconWorkspaceHome({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#8b5cf6" />
      <path
        fill="white"
        opacity="0.92"
        d="M20 36l12-11 12 11v14H20V36zm8 4h8v10h-8V40z"
      />
    </svg>
  );
}

export function IconWorkspaceCompose({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#7c3aed" />
      <path
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
        d="M22 40l8-14 12 22M26 38h14"
      />
    </svg>
  );
}

export function IconWorkspaceSparkle({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#a855f7" />
      <path
        fill="white"
        opacity="0.92"
        d="M32 18l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8zm0 22l1.2 4.8L38 46l-4.8 1.2L32 52l-1.2-4.8L26 46l4.8-1.2L32 40z"
      />
    </svg>
  );
}

export function IconWorkspaceHub({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#4f46e5" />
      <circle cx="24" cy="24" r="5" fill="white" opacity="0.9" />
      <circle cx="40" cy="24" r="5" fill="white" opacity="0.75" />
      <circle cx="32" cy="40" r="5" fill="white" opacity="0.85" />
    </svg>
  );
}

export function IconVoice({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#6366f1" />
      <path
        fill="white"
        d="M32 20c-4 0-6 3-6 7v8c0 4 2 7 6 7s6-3 6-7v-8c0-4-2-7-6-7zm-10 14v2c0 7 5 12 10 12s10-5 10-12v-2h-3v2c0 5-3 9-7 9s-7-4-7-9v-2h-3z"
      />
    </svg>
  );
}

export function IconGenericDoc({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...p}>
      <rect width="64" height="64" rx="14" fill="#64748b" />
      <path
        fill="white"
        d="M22 18h14l8 8v26H22V18zm12 4v10h10"
        opacity="0.9"
      />
    </svg>
  );
}

export type BrandIconId =
  | "route5"
  | "clerk"
  | "supabase"
  | "openai"
  | "slack"
  | "github"
  | "notion"
  | "jira"
  | "linear"
  | "figma"
  | "google"
  | "teams"
  | "salesforce"
  | "hubspot"
  | "snowflake"
  | "confluence"
  | "mcp"
  | "sso"
  | "onprem"
  | "voice"
  | "generic"
  | "workspaceHome"
  | "workspaceCompose"
  | "workspaceSparkle"
  | "workspaceHub";

const MAP: Record<BrandIconId, (p: P) => ReactNode> = {
  route5: IconRoute5,
  clerk: IconClerk,
  supabase: IconSupabase,
  openai: IconOpenAI,
  slack: IconSlack,
  github: IconGitHub,
  notion: IconNotion,
  jira: IconJira,
  linear: IconLinear,
  figma: IconFigma,
  google: IconGoogle,
  teams: IconTeams,
  salesforce: IconSalesforce,
  hubspot: IconHubSpot,
  snowflake: IconSnowflake,
  confluence: IconConfluence,
  mcp: IconMcp,
  sso: IconSso,
  onprem: IconOnPrem,
  voice: IconVoice,
  generic: IconGenericDoc,
  workspaceHome: IconWorkspaceHome,
  workspaceCompose: IconWorkspaceCompose,
  workspaceSparkle: IconWorkspaceSparkle,
  workspaceHub: IconWorkspaceHub,
};

export function MarketplaceBrandSvg({ id, className }: { id: BrandIconId; className?: string }) {
  const Cmp = MAP[id] ?? IconGenericDoc;
  return <Cmp className={className} width={64} height={64} />;
}

/** iOS-style squircle wrapper for app grid / marketplace tiles */
export function BrandSquircle({
  id,
  sizeClass = "h-[52px] w-[52px]",
  className,
}: {
  id: BrandIconId;
  /** Tailwind size classes, e.g. h-16 w-16 for home screen */
  sizeClass?: string;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_rgba(0,0,0,0.14)] ${sizeClass} ${className ?? ""}`}
    >
      <MarketplaceBrandSvg id={id} className="h-full w-full" />
    </span>
  );
}

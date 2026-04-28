import type { ReactNode } from "react";

/** Dark ambient marketing `<main>` (opaque base + mesh). No `theme-agent-shell` — avoids token bleed from workspace. */
export const MARKETING_PUBLIC_SHELL_MAIN_CLASSES =
  "route5-brand-dark-marketing-shell relative min-h-dvh w-full bg-[#09090f] text-zinc-100 antialiased";

type MarketingPublicShellProps = {
  children: ReactNode;
  /** Extra classes on `<main>` (e.g. font variables). */
  className?: string;
};

export default function MarketingPublicShell({ children, className }: MarketingPublicShellProps) {
  if (className?.trim()) {
    return <main className={`${MARKETING_PUBLIC_SHELL_MAIN_CLASSES} ${className}`}>{children}</main>;
  }
  return <main className={MARKETING_PUBLIC_SHELL_MAIN_CLASSES}>{children}</main>;
}

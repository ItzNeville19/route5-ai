import type { ReactNode } from "react";

/** Dark ambient marketing `<main>` (opaque base + mesh). Use with Navbar dark chrome + `Footer tone="command"`. */
export const MARKETING_PUBLIC_SHELL_MAIN_CLASSES =
  "route5-brand-dark-marketing-shell theme-route5-command theme-agent-shell relative min-h-screen text-zinc-100";

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

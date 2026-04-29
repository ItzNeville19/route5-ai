import type { ReactNode } from "react";
import { marketingDarkMainStyle } from "@/components/marketing/marketing-dark-main-style";

/** Dark ambient marketing `<main>` (opaque base + mesh). No `theme-agent-shell` — avoids token bleed from workspace. */
export const MARKETING_PUBLIC_SHELL_MAIN_CLASSES =
  "route5-brand-dark-marketing-shell relative min-h-dvh w-full text-zinc-100 antialiased";

type MarketingPublicShellProps = {
  children: ReactNode;
  /** Extra classes on `<main>` (e.g. font variables). */
  className?: string;
};

export default function MarketingPublicShell({ children, className }: MarketingPublicShellProps) {
  const classes = className?.trim()
    ? `${MARKETING_PUBLIC_SHELL_MAIN_CLASSES} ${className}`
    : MARKETING_PUBLIC_SHELL_MAIN_CLASSES;
  return (
    <main className={classes} style={marketingDarkMainStyle}>
      {children}
    </main>
  );
}

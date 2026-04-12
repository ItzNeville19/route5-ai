import Link from "next/link";
import { PRODUCT_MISSION } from "@/lib/product-truth";

/**
 * Setup flow: same typography and mission as the main workspace, without sidebar.
 */
export default function OnboardingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-agent-shell theme-route5-command relative min-h-dvh text-[var(--workspace-fg)]">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[var(--workspace-canvas)]"
        aria-hidden
      />
      <header className="relative z-20 border-b border-[var(--workspace-border)] bg-[var(--workspace-mission-bg)] px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[720px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/projects"
            className="text-[15px] font-semibold tracking-tight text-[var(--workspace-fg)]"
          >
            {PRODUCT_MISSION.name}
          </Link>
          <p className="max-w-xl text-[12px] leading-snug text-[var(--workspace-muted-fg)] sm:text-right">
            {PRODUCT_MISSION.sidebarTagline}{" "}
            <Link
              href="/docs/product"
              className="font-medium text-[var(--workspace-accent)] underline-offset-2 hover:underline"
            >
              What we ship
            </Link>
          </p>
        </div>
      </header>
      <div className="relative z-10 mx-auto w-full max-w-[720px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        {children}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

type Route5WordmarkLinkProps = {
  href?: string;
  className?: string;
};

/** Text-only wordmark — “Route” + gradient “5” (no separate icon tile). */
export function Route5WordmarkLink({ href = "/feed", className = "" }: Route5WordmarkLinkProps) {
  return (
    <Link
      href={href}
      className={`workspace-brand-wordmark group flex min-w-0 items-center ${className}`.trim()}
      title="Route5 — Feed"
    >
      <span className="min-w-0 font-semibold tracking-[-0.05em]">
        <span className="text-r5-text-primary">Route</span>
        <span className="bg-gradient-to-br from-[#e9d5ff] via-r5-accent to-[#818cf8] bg-clip-text text-transparent">
          5
        </span>
      </span>
    </Link>
  );
}

/** Inline wordmark for headers (e.g. when sidebar is collapsed). */
export function Route5WordmarkInline({ className = "" }: { className?: string }) {
  return (
    <span
      className={`workspace-brand-wordmark inline-flex items-center font-semibold tracking-[-0.05em] ${className}`.trim()}
    >
      <span className="text-r5-text-primary">Route</span>
      <span className="bg-gradient-to-br from-[#e9d5ff] via-r5-accent to-[#818cf8] bg-clip-text text-transparent">
        5
      </span>
    </span>
  );
}

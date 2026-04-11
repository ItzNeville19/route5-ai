"use client";

import { Cpu } from "lucide-react";

/** Minimal HUD icon — gradient tile, no shield. */
export function CommandOrbIcon({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon =
    size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-500 shadow-[0_0_20px_rgba(99,102,241,0.35)] ${dim} ${className ?? ""}`}
    >
      <Cpu className={`${icon} text-white`} strokeWidth={2} aria-hidden />
    </span>
  );
}

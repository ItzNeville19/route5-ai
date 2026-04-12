"use client";

import { useEffect, useState } from "react";

/**
 * Bumps on mount (so clock copy isn’t stale), then on each UTC-local minute boundary
 * (aligned with wall clock, not drifting `setInterval(60s)`), plus focus / visibility.
 * Use as a dependency for time-of-day copy — not for sub-second displays.
 */
export function useAlignedMinuteTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    bump();

    let intervalId: number | null = null;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = window.setTimeout(() => {
      bump();
      intervalId = window.setInterval(bump, 60_000);
    }, msToNextMinute);

    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return tick;
}

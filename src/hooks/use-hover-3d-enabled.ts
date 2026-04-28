"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Hover-only tilt/3D: off for prefers-reduced-motion, touch / coarse pointers, or no hover capability.
 */
export function useHover3dEnabled(): boolean {
  const reducedMotion = useReducedMotion();
  const [fineHover, setFineHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setFineHover(mq.matches);
    const sync = () => setFineHover(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (reducedMotion) return false;
  return fineHover;
}

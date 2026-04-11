"use client";

import { MotionConfig } from "framer-motion";

/**
 * Honors prefers-reduced-motion for all Framer Motion trees beneath the root layout.
 */
export default function MotionConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

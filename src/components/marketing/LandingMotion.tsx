"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { forwardRef } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
} from "framer-motion";

/** Smooth “Apple-like” easing — fast out, gentle settle */
export const LANDING_EASE = [0.22, 1, 0.36, 1] as const;

export const LANDING_SPRING: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.85,
};

export const MotionLink = motion.create(Link);

export const MotionA = motion.a;

export const staggerParent = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.06,
    },
  },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.52,
      ease: LANDING_EASE,
    },
  },
};

export const fadeUpViewport = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.55, ease: LANDING_EASE },
};

type TiltSurfaceProps = {
  children: ReactNode;
  className?: string;
  /** Subtle ambient float for hero-style panels */
  float?: boolean;
};

/**
 * Perspective + spring tilt on hover. Disabled when reduced motion is on.
 */
export function TiltSurface({ children, className, float = false }: TiltSurfaceProps) {
  const reduced = useReducedMotion();

  const inner = (
    <motion.div
      className="will-change-transform [transform-style:preserve-3d] [backface-visibility:hidden]"
      whileHover={
        reduced
          ? undefined
          : {
              rotateX: -4,
              rotateY: 4,
              z: 14,
              transition: LANDING_SPRING,
            }
      }
      whileTap={reduced ? undefined : { scale: 0.992 }}
    >
      {children}
    </motion.div>
  );

  return (
    <div
      className={`relative [perspective:1100px] ${className ?? ""}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {float && !reduced ? (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
          className="[transform-style:preserve-3d]"
        >
          {inner}
        </motion.div>
      ) : (
        inner
      )}
    </div>
  );
}

type LiftCardProps = HTMLMotionProps<"div"> & { children: ReactNode };

/** Card lift + micro tilt without full mouse tracking — great for grids */
export const LiftCard = forwardRef<HTMLDivElement, LiftCardProps>(function LiftCard(
  { children, className, ...rest },
  ref
) {
  const reduced = useReducedMotion();
  return (
    <div className="relative [perspective:900px]" style={{ transformStyle: "preserve-3d" }}>
      <motion.div
        ref={ref}
        className={`will-change-transform [transform-style:preserve-3d] ${className ?? ""}`}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.48, ease: LANDING_EASE }}
        whileHover={
          reduced
            ? { y: -3, boxShadow: "0 24px 48px -24px rgba(15,23,42,0.18)" }
            : {
                y: -6,
                rotateX: 2,
                rotateY: -2,
                z: 8,
                boxShadow: "0 28px 56px -28px rgba(37,99,235,0.22)",
                transition: LANDING_SPRING,
              }
        }
        {...rest}
      >
        {children}
      </motion.div>
    </div>
  );
});

type InteractiveChipProps = ComponentPropsWithoutRef<typeof motion.span> & { children: ReactNode };

export function InteractiveChip({ children, className, ...rest }: InteractiveChipProps) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={className}
      whileHover={reduced ? { y: -1 } : { y: -3, scale: 1.03, transition: LANDING_SPRING }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      {...rest}
    >
      {children}
    </motion.span>
  );
}

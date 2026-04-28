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
import { easeMarketing, durationMd, transitionMarketingSpring } from "@/lib/motion";
import { useHover3dEnabled } from "@/hooks/use-hover-3d-enabled";

/** @deprecated Prefer `easeMarketing` from `@/lib/motion` */
export const LANDING_EASE = easeMarketing;

/** @deprecated Prefer `transitionMarketingSpring` from `@/lib/motion` */
export const LANDING_SPRING: Transition = transitionMarketingSpring;

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

export const staggerReduceMotionParent = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0,
      delayChildren: 0,
    },
  },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durationMd,
      ease: LANDING_EASE,
    },
  },
};

/** Instant settle when prefers-reduced-motion (pairs with staggerReduceMotionParent). */
export const staggerInstantChild = {
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
};

export const fadeUpViewport = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.55, ease: LANDING_EASE },
};

/** No travel / fade choreography when prefers-reduced-motion. */
export function marketingFadeViewport(reducedMotion: boolean | undefined | null) {
  if (reducedMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.15 },
      transition: { duration: 0 },
    };
  }
  return fadeUpViewport;
}

type TiltSurfaceProps = {
  children: ReactNode;
  className?: string;
  /** Subtle ambient float for hero-style panels */
  float?: boolean;
};

/**
 * Perspective + spring tilt on hover. Disabled without fine pointer hover (touch / reduced motion).
 */
export function TiltSurface({ children, className, float = false }: TiltSurfaceProps) {
  const hover3d = useHover3dEnabled();

  const inner = (
    <motion.div
      className="will-change-transform [transform-style:preserve-3d] [backface-visibility:hidden]"
      whileHover={
        hover3d
          ? {
              rotateX: -4,
              rotateY: 4,
              z: 14,
              transition: LANDING_SPRING,
            }
          : undefined
      }
      whileTap={hover3d ? { scale: 0.992 } : undefined}
    >
      {children}
    </motion.div>
  );

  return (
    <div
      className={`relative [perspective:1100px] ${className ?? ""}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {float && hover3d ? (
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

/** Card lift + micro tilt — fine-pointer hover only; lift flattens on touch. */
export const LiftCard = forwardRef<HTMLDivElement, LiftCardProps>(function LiftCard(
  { children, className, ...rest },
  ref
) {
  const hover3d = useHover3dEnabled();
  const reducedMotion = useReducedMotion();
  return (
    <div className="relative [perspective:900px]" style={{ transformStyle: "preserve-3d" }}>
      <motion.div
        ref={ref}
        className={`will-change-transform [transform-style:preserve-3d] ${className ?? ""}`}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reducedMotion ? 0 : 0.48, ease: LANDING_EASE }}
        whileHover={
          hover3d
            ? {
                y: -6,
                rotateX: 2,
                rotateY: -2,
                z: 8,
                boxShadow: "0 28px 56px -28px rgba(37,99,235,0.22)",
                transition: LANDING_SPRING,
              }
            : { y: -3, transition: LANDING_SPRING }
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
  const hover3d = useHover3dEnabled();
  return (
    <motion.span
      className={className}
      whileHover={hover3d ? { y: -3, scale: 1.03, transition: LANDING_SPRING } : { y: -1 }}
      whileTap={hover3d ? { scale: 0.98 } : undefined}
      {...rest}
    >
      {children}
    </motion.span>
  );
}

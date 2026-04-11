import type { Transition, Variants } from "framer-motion";

/** Apple-like ease — smooth deceleration */
export const easeApple = [0.22, 1, 0.36, 1] as const;

export const defaultTransition: Transition = {
  duration: 0.55,
  ease: easeApple,
};

export const staggerTransition = (delay = 0): Transition => ({
  ...defaultTransition,
  delay,
});

/** useInView options — reliable intersection without hiding content forever */
export const inViewOpts = {
  once: true as const,
  amount: 0.12 as const,
  margin: "0px 0px -48px 0px" as const,
};

/**
 * Replaces the broken pattern `animate={inView ? shown : {}}` which left opacity at 0.
 * Content is always readable; only Y shifts until the section enters view.
 */
export function revealY(inView: boolean, hiddenY = 20) {
  return {
    initial: { opacity: 1, y: hiddenY },
    animate: { opacity: 1, y: inView ? 0 : hiddenY },
    transition: defaultTransition,
  };
}

/** Stagger containers: never use opacity 0 on hidden — avoids blank sections */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.12 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 1, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeApple },
  },
};

export const staggerItemTight: Variants = {
  hidden: { opacity: 1, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeApple },
  },
};

export const scaleInCard: Variants = {
  hidden: { opacity: 1, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, ease: easeApple },
  },
};

/** Vertical timeline line — never fully invisible */
export const lineGrow: Variants = {
  hidden: { scaleY: 0.2, opacity: 1 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: { duration: 1.1, ease: easeApple },
  },
};

/** Snappy spring for modals, nav, micro-interactions */
export const springSoft = { type: "spring" as const, stiffness: 380, damping: 32 };

export const springGentle = { type: "spring" as const, stiffness: 260, damping: 28 };

/** Command palette / overlays */
export const paletteOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.22, ease: easeApple },
  },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const palettePanel: Variants = {
  hidden: { opacity: 0, y: -16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSoft,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.985,
    transition: { duration: 0.2, ease: easeApple },
  },
};

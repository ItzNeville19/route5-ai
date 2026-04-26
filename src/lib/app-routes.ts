/**
 * Canonical signed-in routes.
 * Desk (`/desk`) is the primary execution surface. `/feed` redirects to Desk and preserves query.
 */
export const DESK_HREF = "/desk" as const;
/** Post-auth, onboarding complete, marketing CTAs — land in the workspace here. */
export const WORKSPACE_HOME_HREF = "/overview" as const;
export const OVERVIEW_HREF = "/overview" as const;
/** Legacy org-wide stream URL; server redirects to {@link WORKSPACE_HOME_HREF}. */
export const FEED_HREF = "/feed" as const;

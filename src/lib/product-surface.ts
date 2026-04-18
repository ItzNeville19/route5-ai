/**
 * When true, non-core navigation and page sections are hidden so the signed-in
 * experience stays focused on execution state. No routes or components are removed;
 * UI checks this flag and skips rendering optional chrome.
 *
 * Overview still always shows execution-critical panels: commitment snapshot, 30-day
 * completion trend, open-actions strip, and recent activity — those are data, not noise.
 */
export const PRODUCT_SURFACE_MINIMAL = true;

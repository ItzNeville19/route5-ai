"use client";

type NextRouterPush = {
  push: (href: string, options?: { scroll?: boolean }) => void;
};

/**
 * Navigate to Desk with a session draft (`writeExtractionDraft` must be called first).
 * Uses `scroll: true` so the capture surface lands in view after SPA navigation.
 */
export function pushDeskWithDraft(
  router: NextRouterPush,
  opts: { projectId?: string; preset?: string | null } = {}
): void {
  const q = new URLSearchParams();
  q.set("draft", "1");
  if (opts.projectId) q.set("projectId", opts.projectId);
  if (opts.preset?.trim()) q.set("preset", opts.preset.trim());
  const href = `/desk?${q.toString()}`;
  router.push(href, { scroll: true });
}

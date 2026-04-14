"use client";

import { deskUrl } from "@/lib/desk-routes";

type NextRouterPush = {
  push: (href: string, options?: { scroll?: boolean }) => void;
};

/**
 * Navigate to Desk with a session draft (`writeExtractionDraft` must be called first).
 * Uses `scroll: true` so the capture surface lands in view after SPA navigation.
 * Omitting `preset` applies the wedge default (Client program). Pass `preset: null` for no template.
 */
export function pushDeskWithDraft(
  router: NextRouterPush,
  opts: { projectId?: string; preset?: string | null } = {}
): void {
  const hasPreset = Object.prototype.hasOwnProperty.call(opts, "preset");
  router.push(
    deskUrl({
      draft: true,
      projectId: opts.projectId,
      ...(hasPreset ? { preset: opts.preset } : {}),
    }),
    { scroll: true }
  );
}

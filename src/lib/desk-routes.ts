/**
 * Canonical Desk URLs — primary GTM wedge defaults to Client program preset unless overridden.
 */

import { DEFAULT_DESK_PRESET_ID } from "@/lib/positioning-wedge";

export { DEFAULT_DESK_PRESET_ID } from "@/lib/positioning-wedge";

export type DeskRouteOpts = {
  projectId?: string;
  /** `undefined` = wedge default (Client program); `null` = no preset in URL */
  preset?: string | null;
  draft?: boolean;
};

/** Build `/desk?...` with optional project, draft, and preset (wedge default when preset omitted). */
export function deskUrl(opts: DeskRouteOpts = {}): string {
  const q = new URLSearchParams();
  if (opts.draft) q.set("draft", "1");
  if (opts.projectId) q.set("projectId", opts.projectId);
  if ("preset" in opts) {
    if (opts.preset?.trim()) q.set("preset", opts.preset.trim());
  } else {
    q.set("preset", DEFAULT_DESK_PRESET_ID);
  }
  return `/desk?${q.toString()}`;
}

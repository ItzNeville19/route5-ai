import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";

const FRESH_MS = 48 * 60 * 60 * 1000;

/** Whether the full AI command center block should appear on Projects. */
export function shouldShowCommandCenterOnProjects(
  prefs: WorkspacePrefsV1,
  accountCreatedAt: Date | undefined
): boolean {
  const mode = prefs.commandCenterMode ?? "auto";
  if (mode === "off") return false;
  if (mode === "on") return true;
  const t = accountCreatedAt?.getTime();
  if (!t) return true;
  return Date.now() - t < FRESH_MS;
}

/** Aligns dashboard surface & toolbar so employees never land on admin metrics accidentally. */

export type WorkspaceSurfaceMode = "admin" | "employee";

export function resolveWorkspaceSurfaceMode(
  canOrg: boolean,
  viewParam: string | null,
  defaultWorkspaceView: WorkspaceSurfaceMode | undefined
): WorkspaceSurfaceMode {
  if (!canOrg) return "employee";
  if (viewParam === "employee") return "employee";
  if (viewParam === "admin") return "admin";
  return defaultWorkspaceView === "employee" ? "employee" : "admin";
}

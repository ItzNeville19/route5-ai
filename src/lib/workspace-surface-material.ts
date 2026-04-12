/** Workspace chrome: liquid glass vs balanced vs flat (no blur). */

export const WORKSPACE_SURFACE_MATERIAL_IDS = ["liquid", "standard", "flat"] as const;

export type WorkspaceSurfaceMaterialId = (typeof WORKSPACE_SURFACE_MATERIAL_IDS)[number];

export const DEFAULT_WORKSPACE_SURFACE_MATERIAL: WorkspaceSurfaceMaterialId = "standard";

export function isWorkspaceSurfaceMaterialId(s: string): s is WorkspaceSurfaceMaterialId {
  return (WORKSPACE_SURFACE_MATERIAL_IDS as readonly string[]).includes(s);
}

export function resolveWorkspaceSurfaceMaterial(
  v: string | undefined
): WorkspaceSurfaceMaterialId {
  return v && isWorkspaceSurfaceMaterialId(v) ? v : DEFAULT_WORKSPACE_SURFACE_MATERIAL;
}

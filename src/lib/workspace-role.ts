export type OrgRole = "admin" | "manager" | "member";

export function isOrgAdmin(role: OrgRole | null): boolean {
  return role === "admin";
}

export function isOrgLeadership(role: OrgRole | null): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Admins and managers can create companies and run org-level setup. Members focus on assigned work.
 */
export function canCreateCompany(role: OrgRole | null): boolean {
  return isOrgLeadership(role);
}

/** Short label for UI chips. */
export function orgRoleLabel(role: OrgRole | null): string {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  if (role === "member") return "Member";
  return "Member";
}

import { isFounderEmail } from "@/lib/founder-access";

/** Feature flags used by both server and client modules. */
export function isDeveloperToolsEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_ROUTE5_SHOW_DEV_TOOLS?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/** Dev tools + workspace developer routes — env flag or founder email (see NEXT_PUBLIC_ROUTE5_FOUNDER_EMAILS). */
export function canAccessDeveloperTools(userEmail: string | null | undefined): boolean {
  return isDeveloperToolsEnabled() || isFounderEmail(userEmail);
}

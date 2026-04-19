/** Feature flags used by both server and client modules. */
export function isDeveloperToolsEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_ROUTE5_SHOW_DEV_TOOLS?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

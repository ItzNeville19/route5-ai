/** Shared copy + formatting for plan limits vs usage (Overview, account, etc.). */

export function formatPlanCap(cap: number): string {
  if (!Number.isFinite(cap) || cap >= 999999) return "Unlimited";
  return cap.toLocaleString();
}

/** 0–100 for progress bars; unlimited caps return null (hide bar). */
export function planUsagePercent(used: number, cap: number): number | null {
  if (!Number.isFinite(cap) || cap >= 999999) return null;
  if (cap <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / cap) * 100)));
}

export function isNearOrOverLimit(used: number, cap: number): boolean {
  const p = planUsagePercent(used, cap);
  if (p === null) return false;
  return p >= 85;
}

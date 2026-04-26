import type { Commitment } from "@/lib/commitments/types";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export function isOverdue(row: Commitment): boolean {
  if (row.status === "done" || !row.dueDate) return false;
  const due = new Date(row.dueDate).getTime();
  return Number.isFinite(due) && due < Date.now();
}

export function isUnassigned(row: Commitment): boolean {
  return !row.owner || !row.owner.trim();
}

export function isAtRisk(row: Commitment): boolean {
  if (isOverdue(row)) return true;
  if (isUnassigned(row)) return true;
  const updated = new Date(row.updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated > STALE_MS;
}

export function isActive(row: Commitment): boolean {
  return row.status !== "done";
}

export function teamLoad(rows: Commitment[]): Array<{ owner: string; activeCount: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!isActive(row)) continue;
    const owner = row.owner?.trim() || "Unassigned";
    map.set(owner, (map.get(owner) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([owner, activeCount]) => ({ owner, activeCount }))
    .sort((a, b) => b.activeCount - a.activeCount);
}

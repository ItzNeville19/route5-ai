import type { Commitment } from "@/lib/commitments/types";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 48 * 60 * 60 * 1000;

export function isOverdue(row: Commitment): boolean {
  if (row.status === "done" || !row.dueDate) return false;
  const due = new Date(row.dueDate).getTime();
  return Number.isFinite(due) && due < Date.now();
}

export function isUnassigned(row: Commitment): boolean {
  return !row.owner || !row.owner.trim();
}

export function isAtRisk(row: Commitment): boolean {
  if (row.status === "done") return false;
  if (isOverdue(row)) return true;
  if (isUnassigned(row)) return true;
  if (isBlocked(row)) return true;
  if (isUnaccepted(row)) return true;
  const updated = new Date(row.updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated > STALE_MS;
}

export function isActive(row: Commitment): boolean {
  return row.status !== "done";
}

export function isBlocked(row: Commitment): boolean {
  return row.status === "blocked";
}

export function isUnaccepted(row: Commitment): boolean {
  return row.status === "pending" || row.status === "reopened";
}

export function isDueSoon(row: Commitment): boolean {
  if (row.status === "done" || !row.dueDate) return false;
  const due = new Date(row.dueDate).getTime();
  if (!Number.isFinite(due)) return false;
  const delta = due - Date.now();
  return delta >= 0 && delta <= DUE_SOON_MS;
}

export function completedToday(row: Commitment): boolean {
  if (row.status !== "done") return false;
  const updated = new Date(row.updatedAt);
  if (Number.isNaN(updated.getTime())) return false;
  const now = new Date();
  return (
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate()
  );
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

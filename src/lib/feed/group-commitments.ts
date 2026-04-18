import type { OrgCommitmentRow } from "@/lib/org-commitment-types";

export type FeedBucket = "overdue" | "today" | "week" | "later" | "completed";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isCompletedRow(c: OrgCommitmentRow): boolean {
  return c.status === "completed" || Boolean(c.completedAt);
}

/** Group org commitments for the Feed (local calendar). */
export function bucketForCommitment(c: OrgCommitmentRow): FeedBucket {
  if (isCompletedRow(c)) return "completed";

  const deadline = new Date(c.deadline);
  if (!Number.isFinite(deadline.getTime())) return "later";

  const today = startOfLocalDay(new Date());
  const dueDay = startOfLocalDay(deadline);

  if (dueDay < today || c.status === "overdue") return "overdue";
  if (dueDay.getTime() === today.getTime()) return "today";

  const weekEnd = addDays(today, 7);
  if (dueDay <= weekEnd) return "week";
  return "later";
}

export function isMissingDeadline(iso: string): boolean {
  const deadline = new Date(iso);
  return !Number.isFinite(deadline.getTime());
}

/** Completed items older than this are omitted from the Feed list. */
const COMPLETED_RETENTION_MS = 30 * 86_400_000;

export function isCompletedVisibleInFeed(c: OrgCommitmentRow): boolean {
  if (!c.completedAt) return false;
  const t = new Date(c.completedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= COMPLETED_RETENTION_MS;
}

export function formatFeedDueLabel(iso: string): string {
  const deadline = new Date(iso);
  if (!Number.isFinite(deadline.getTime())) return "Set deadline";

  const today = startOfLocalDay(new Date());
  const dueDay = startOfLocalDay(deadline);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6) return `In ${diffDays} days`;
  if (diffDays < -1) return `${-diffDays} days overdue`;

  return deadline.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: dueDay.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function groupFeedRows(rows: OrgCommitmentRow[]): Record<FeedBucket, OrgCommitmentRow[]> {
  const buckets: Record<FeedBucket, OrgCommitmentRow[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    completed: [],
  };
  for (const c of rows) {
    if (isCompletedRow(c) && !isCompletedVisibleInFeed(c)) continue;
    buckets[bucketForCommitment(c)].push(c);
  }
  const byDeadline = (a: OrgCommitmentRow, b: OrgCommitmentRow) =>
    new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  const byCompleted = (a: OrgCommitmentRow, b: OrgCommitmentRow) =>
    new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime();

  buckets.overdue.sort(byDeadline);
  buckets.today.sort(byDeadline);
  buckets.week.sort(byDeadline);
  buckets.later.sort(byDeadline);
  buckets.completed.sort(byCompleted);
  return buckets;
}

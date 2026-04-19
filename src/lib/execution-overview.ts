import type {
  Commitment,
  CommitmentRiskItem,
  ExecutionOverview,
  TeamLoadEntry,
} from "@/lib/commitment-types";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const OVERLOAD_THRESHOLD = 8;

function projectName(projectNameById: Map<string, string>, projectId: string): string {
  return projectNameById.get(projectId) ?? "Project";
}

function startOfUtcWeek(isoNow = new Date().toISOString()): string {
  const d = new Date(isoNow);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function ownerLabel(c: Commitment): string {
  if (c.ownerDisplayName?.trim()) return c.ownerDisplayName.trim();
  if (c.ownerUserId) return c.ownerUserId;
  return "Unassigned";
}

function ownerKey(c: Commitment): string {
  if (c.ownerUserId) return `u:${c.ownerUserId}`;
  if (c.ownerDisplayName?.trim()) return `n:${c.ownerDisplayName.trim().toLowerCase()}`;
  return "__unassigned";
}

/** Empty aggregates when the user has no commitments or the API failed. */
export function emptyExecutionOverview(): ExecutionOverview {
  return buildExecutionOverview([], new Map());
}

/** Aggregate dashboard payload from all commitments visible to the workspace. */
export function buildExecutionOverview(
  commitments: Commitment[],
  projectNameById: Map<string, string>
): ExecutionOverview {
  const weekStart = startOfUtcWeek();

  const visible = commitments.filter((c) => !c.archivedAt);
  const nonDone = visible.filter((c) => c.status !== "completed");
  const activeTotal = nonDone.length;

  const completedThisWeek = visible.filter(
    (c) => c.status === "completed" && c.lastUpdatedAt >= weekStart
  ).length;

  const denom = Math.max(1, completedThisWeek + activeTotal);
  const pctCompletedThisWeek = Math.round((100 * completedThisWeek) / denom);

  const atRiskCount = nonDone.filter((c) => c.status === "at_risk").length;
  const overdueCount = nonDone.filter((c) => c.status === "overdue").length;
  const unassignedCount = nonDone.filter(
    (c) => !c.ownerUserId && !c.ownerDisplayName?.trim()
  ).length;

  const now = Date.now();
  const riskFeed: CommitmentRiskItem[] = [];

  for (const c of nonDone) {
    const unassigned = !c.ownerUserId && !c.ownerDisplayName?.trim();
    const stale =
      now - new Date(c.lastUpdatedAt).getTime() > STALE_MS &&
      c.status !== "overdue" &&
      c.status !== "at_risk";

    let riskReason: CommitmentRiskItem["riskReason"] | null = null;
    let urgencyScore = 0;
    if (c.status === "overdue") {
      riskReason = "overdue";
      urgencyScore = 100;
    } else if (unassigned) {
      riskReason = "unassigned";
      urgencyScore = 85;
    } else if (c.status === "at_risk" || stale) {
      riskReason = "stalled";
      urgencyScore = c.status === "at_risk" ? 70 : 55;
    }

    if (riskReason) {
      riskFeed.push({
        ...c,
        projectName: projectName(projectNameById, c.projectId),
        riskReason,
        urgencyScore,
      });
    }
  }

  riskFeed.sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return ad - bd;
  });

  const loadMap = new Map<string, { key: string; label: string; ownerUserId: string | null; n: number }>();
  for (const c of nonDone) {
    const key = ownerKey(c);
    const label = ownerLabel(c);
    const prev = loadMap.get(key);
    const ownerUserId = c.ownerUserId;
    if (prev) {
      prev.n += 1;
    } else {
      loadMap.set(key, {
        key,
        label,
        ownerUserId,
        n: 1,
      });
    }
  }

  const teamLoad: TeamLoadEntry[] = [...loadMap.values()].map((v) => ({
    key: v.key,
    label: v.label,
    ownerUserId: v.ownerUserId,
    activeCount: v.n,
    overloaded: v.n > OVERLOAD_THRESHOLD,
  }));
  teamLoad.sort((a, b) => b.activeCount - a.activeCount);

  const recentActivity: ExecutionOverview["recentActivity"] = [];
  for (const c of visible) {
    for (const e of c.activityLog) {
      recentActivity.push({
        commitmentId: c.id,
        projectId: c.projectId,
        projectName: projectName(projectNameById, c.projectId),
        title: c.title,
        at: e.at,
        body: e.body,
      });
    }
  }
  recentActivity.sort((a, b) => (a.at < b.at ? 1 : -1));
  const recentTrim = recentActivity.slice(0, 30);

  const dueGroups = new Map<string, { ownerLabel: string; dueDate: string; titles: string[] }>();
  for (const c of nonDone) {
    if (!c.dueDate) continue;
    const day = c.dueDate.slice(0, 10);
    const ok = `${ownerLabel(c)}|${day}`;
    const g = dueGroups.get(ok);
    const title = c.title;
    if (g) {
      g.titles.push(title);
    } else {
      dueGroups.set(ok, { ownerLabel: ownerLabel(c), dueDate: c.dueDate, titles: [title] });
    }
  }
  const conflictingDeadlines = [...dueGroups.values()].filter((g) => g.titles.length >= 2);

  return {
    summary: {
      activeTotal,
      pctCompletedThisWeek,
      atRiskCount,
      overdueCount,
      unassignedCount,
    },
    riskFeed: riskFeed.slice(0, 40),
    teamLoad,
    recentActivity: recentTrim,
    conflictingDeadlines,
  };
}

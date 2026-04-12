/**
 * Derives dashboard charts from real `created_at` timestamps only (no randomness).
 */

/** One extraction row for execution analytics (from DB). */
export type ExecutionExtractionInput = {
  projectId: string;
  projectName: string;
  createdAt: string;
  decisions: string[];
  actionItems: { completed: boolean }[];
};

export type ProjectHealthRow = {
  projectId: string;
  projectName: string;
  /** 0–100 from completion + recency of runs */
  score: number;
  extractionCount: number;
  openActions: number;
  completedRatio: number | null;
};

export type WorkspaceExecutionMetrics = {
  actionItemsTotal: number;
  actionItemsCompleted: number;
  /** null when there are no action items */
  actionCompletionRate: number | null;
  /** Incomplete actions on runs older than 7 days (UTC) */
  staleOpenActions: number;
  decisionsTotal: number;
  /** null when extractionCount === 0 */
  avgDecisionsPerExtraction: number | null;
  /** Distinct projects with at least one extraction in the last 7 UTC days */
  projectsWithRunsLast7Days: number;
  projectHealth: ProjectHealthRow[];
};

/**
 * Computes execution metrics from extraction rows — no fabricated numbers.
 */
export function computeExecutionMetrics(
  rows: ExecutionExtractionInput[],
  nowMs: number = Date.now()
): WorkspaceExecutionMetrics {
  const STALE_MS = 7 * 86400000;
  const sevenAgo = nowMs - 7 * 86400000;
  const projectsWithRunLast7 = new Set<string>();

  let actionItemsTotal = 0;
  let actionItemsCompleted = 0;
  let staleOpenActions = 0;
  let decisionsTotal = 0;

  type ProjAgg = {
    name: string;
    extractionCount: number;
    completed: number;
    totalActions: number;
    openActions: number;
    lastMs: number;
  };

  const byProject = new Map<string, ProjAgg>();

  for (const r of rows) {
    const t = new Date(r.createdAt).getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= sevenAgo) projectsWithRunLast7.add(r.projectId);

    decisionsTotal += r.decisions.length;

    let p = byProject.get(r.projectId);
    if (!p) {
      p = {
        name: r.projectName,
        extractionCount: 0,
        completed: 0,
        totalActions: 0,
        openActions: 0,
        lastMs: 0,
      };
      byProject.set(r.projectId, p);
    }
    p.extractionCount++;
    if (r.projectName.trim()) p.name = r.projectName;
    if (t > p.lastMs) p.lastMs = t;

    for (const a of r.actionItems) {
      actionItemsTotal++;
      p.totalActions++;
      if (a.completed) {
        actionItemsCompleted++;
        p.completed++;
      } else {
        p.openActions++;
        if (nowMs - t > STALE_MS) {
          staleOpenActions++;
        }
      }
    }
  }

  const actionCompletionRate =
    actionItemsTotal > 0 ? actionItemsCompleted / actionItemsTotal : null;

  const extractionCount = rows.length;
  const avgDecisionsPerExtraction =
    extractionCount > 0 ? decisionsTotal / extractionCount : null;

  const fourteenAgo = nowMs - 14 * 86400000;
  const projectHealth: ProjectHealthRow[] = [];

  for (const [projectId, p] of byProject) {
    const ratio = p.totalActions > 0 ? p.completed / p.totalActions : null;
    const recent = p.lastMs >= fourteenAgo;
    let score = 28;
    if (p.extractionCount > 0) score += 12;
    if (recent) score += 28;
    if (p.totalActions > 0 && ratio !== null) {
      score += Math.round(32 * ratio);
    } else if (p.extractionCount > 0) {
      score += 10;
    }
    score = Math.min(100, score);

    projectHealth.push({
      projectId,
      projectName: p.name || "Project",
      score,
      extractionCount: p.extractionCount,
      openActions: p.openActions,
      completedRatio: ratio,
    });
  }

  projectHealth.sort((a, b) => b.score - a.score);

  return {
    actionItemsTotal,
    actionItemsCompleted,
    actionCompletionRate,
    staleOpenActions,
    decisionsTotal,
    avgDecisionsPerExtraction,
    projectsWithRunsLast7Days: projectsWithRunLast7.size,
    projectHealth,
  };
}

export function emptyExecutionMetrics(): WorkspaceExecutionMetrics {
  return {
    actionItemsTotal: 0,
    actionItemsCompleted: 0,
    actionCompletionRate: null,
    staleOpenActions: 0,
    decisionsTotal: 0,
    avgDecisionsPerExtraction: null,
    projectsWithRunsLast7Days: 0,
    projectHealth: [],
  };
}

/** One extraction for activity charts — real timestamps only. */
export type ExtractionActivityPoint = {
  createdAt: string;
  /** Decisions array length on this run (drives second trend line). */
  decisionCount: number;
};

export type WorkspaceActivityStats = {
  /** Seven days, oldest → newest (UTC calendar days). */
  extractionsByDayLast7: number[];
  /** Sum of decision counts per UTC day (same 7 buckets as extractions). */
  decisionsByDayLast7: number[];
  /** Rows Mon–Sun (0–6), cols = 4-hour UTC blocks (0–5). Extraction counts, last 14 days. */
  heatmap7x6: number[][];
  last7DaysCount: number;
  prior7DaysCount: number;
  /** `null` when both windows are empty. */
  weekOverWeekPercent: number | null;
};

/** X-axis labels aligned with `extractionsByDayLast7` (oldest → newest). */
export function getChartDayLabelsUtc(nowMs: number = Date.now()): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const start = utcDayStart(nowMs, 6 - i);
    return new Date(start).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  });
}

function utcDayStart(nowMs: number, daysAgo: number): number {
  const d = new Date(nowMs);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.getTime();
}

/** Time windows for the interactive runs/decisions chart (UTC buckets). */
export type ChartTimeRange = "7d" | "30d" | "90d" | "1y" | "all";

export type ActivitySeriesPayload = {
  runs: number[];
  decisions: number[];
  labels: string[];
  granularity: "day" | "week" | "month";
};

export type ActivitySeriesByRange = Record<ChartTimeRange, ActivitySeriesPayload>;

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

function emptySeries(granularity: ActivitySeriesPayload["granularity"]): ActivitySeriesPayload {
  return { runs: [], decisions: [], labels: [], granularity };
}

export function emptyActivitySeries(): ActivitySeriesByRange {
  return {
    "7d": emptySeries("day"),
    "30d": emptySeries("day"),
    "90d": emptySeries("week"),
    "1y": emptySeries("month"),
    all: emptySeries("month"),
  };
}

function sumPointsInRange(
  points: ExtractionActivityPoint[],
  start: number,
  end: number
): { runs: number; decisions: number } {
  let runs = 0;
  let decisions = 0;
  for (const p of points) {
    const t = new Date(p.createdAt).getTime();
    if (!Number.isFinite(t) || t < start || t >= end) continue;
    runs += 1;
    decisions += Math.max(0, p.decisionCount);
  }
  return { runs, decisions };
}

function computeSeries7d(points: ExtractionActivityPoint[], nowMs: number): ActivitySeriesPayload {
  const runs: number[] = [];
  const decisions: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const start = utcDayStart(nowMs, 6 - i);
    const end = start + DAY_MS;
    const s = sumPointsInRange(points, start, end);
    runs.push(s.runs);
    decisions.push(s.decisions);
    labels.push(
      new Date(start).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }
  return { runs, decisions, labels, granularity: "day" };
}

function computeSeries30d(points: ExtractionActivityPoint[], nowMs: number): ActivitySeriesPayload {
  const runs: number[] = [];
  const decisions: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i < 30; i++) {
    const start = utcDayStart(nowMs, 29 - i);
    const end = start + DAY_MS;
    const s = sumPointsInRange(points, start, end);
    runs.push(s.runs);
    decisions.push(s.decisions);
    labels.push(
      new Date(start).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    );
  }
  return { runs, decisions, labels, granularity: "day" };
}

function computeSeries90d(points: ExtractionActivityPoint[], nowMs: number): ActivitySeriesPayload {
  const runs: number[] = [];
  const decisions: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i < 13; i++) {
    let winStart: number;
    let winEnd: number;
    if (i === 12) {
      winStart = nowMs - WEEK_MS;
      winEnd = nowMs + 1;
    } else {
      winEnd = nowMs - (12 - i) * WEEK_MS;
      winStart = winEnd - WEEK_MS;
    }
    const s = sumPointsInRange(points, winStart, winEnd);
    runs.push(s.runs);
    decisions.push(s.decisions);
    labels.push(
      new Date(winStart).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    );
  }
  return { runs, decisions, labels, granularity: "week" };
}

function computeSeries1y(points: ExtractionActivityPoint[], nowMs: number): ActivitySeriesPayload {
  const runs: number[] = [];
  const decisions: number[] = [];
  const labels: string[] = [];
  const now = new Date(nowMs);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let k = 0; k < 12; k++) {
    const start = Date.UTC(y, m - 11 + k, 1);
    const end = Date.UTC(y, m - 10 + k, 1);
    const s = sumPointsInRange(points, start, end);
    runs.push(s.runs);
    decisions.push(s.decisions);
    labels.push(
      new Date(start).toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      })
    );
  }
  return { runs, decisions, labels, granularity: "month" };
}

function computeSeriesAll(points: ExtractionActivityPoint[], nowMs: number): ActivitySeriesPayload {
  let minTs = Infinity;
  for (const p of points) {
    const t = new Date(p.createdAt).getTime();
    if (Number.isFinite(t)) minTs = Math.min(minTs, t);
  }
  if (!Number.isFinite(minTs)) {
    return emptySeries("month");
  }
  const capMonths = 36;
  const first = new Date(minTs);
  const now = new Date(nowMs);
  const yN = now.getUTCFullYear();
  const mN = now.getUTCMonth();
  const y0 = first.getUTCFullYear();
  const m0 = first.getUTCMonth();
  let totalMonths = (yN - y0) * 12 + (mN - m0) + 1;
  totalMonths = Math.min(Math.max(1, totalMonths), capMonths);

  const runs: number[] = [];
  const decisions: number[] = [];
  const labels: string[] = [];

  const anchor = new Date(Date.UTC(yN, mN - (totalMonths - 1), 1));
  for (let k = 0; k < totalMonths; k++) {
    const t0 = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + k, 1);
    const t1 = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + k + 1, 1);
    const s = sumPointsInRange(points, t0, t1);
    runs.push(s.runs);
    decisions.push(s.decisions);
    labels.push(
      new Date(t0).toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      })
    );
  }
  return { runs, decisions, labels, granularity: "month" };
}

/**
 * Precomputed chart buckets for every range — derived from the same extraction timestamps as Overview.
 */
export function computeAllActivitySeries(
  points: ExtractionActivityPoint[],
  nowMs: number = Date.now()
): ActivitySeriesByRange {
  return {
    "7d": computeSeries7d(points, nowMs),
    "30d": computeSeries30d(points, nowMs),
    "90d": computeSeries90d(points, nowMs),
    "1y": computeSeries1y(points, nowMs),
    all: computeSeriesAll(points, nowMs),
  };
}

export function computeActivityStats(
  points: ExtractionActivityPoint[],
  nowMs: number = Date.now()
): WorkspaceActivityStats {
  const s7 = computeSeries7d(points, nowMs);
  const extractionsByDayLast7 = s7.runs;
  const decisionsByDayLast7 = s7.decisions;

  const t7 = nowMs - 7 * 86400000;
  const t14 = nowMs - 14 * 86400000;

  let last7DaysCount = 0;
  let prior7DaysCount = 0;
  for (const p of points) {
    const t = new Date(p.createdAt).getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= t7 && t <= nowMs) last7DaysCount++;
    else if (t >= t14 && t < t7) prior7DaysCount++;
  }

  let weekOverWeekPercent: number | null = null;
  if (last7DaysCount === 0 && prior7DaysCount === 0) {
    weekOverWeekPercent = null;
  } else if (prior7DaysCount === 0) {
    weekOverWeekPercent = last7DaysCount > 0 ? 100 : null;
  } else {
    weekOverWeekPercent = ((last7DaysCount - prior7DaysCount) / prior7DaysCount) * 100;
  }

  const heatmap7x6: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 6 }, () => 0));
  const tCut = nowMs - 14 * 86400000;
  for (const p of points) {
    const t = new Date(p.createdAt).getTime();
    if (!Number.isFinite(t) || t < tCut) continue;
    const d = new Date(p.createdAt);
    const dow = (d.getUTCDay() + 6) % 7;
    const block = Math.min(5, Math.floor(d.getUTCHours() / 4));
    heatmap7x6[dow]![block]!++;
  }

  return {
    extractionsByDayLast7,
    decisionsByDayLast7,
    heatmap7x6,
    last7DaysCount,
    prior7DaysCount,
    weekOverWeekPercent,
  };
}

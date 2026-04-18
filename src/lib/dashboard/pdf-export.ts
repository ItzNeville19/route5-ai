import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LiveDashboardMetrics, VelocityWeek } from "@/lib/dashboard/compute";
import type { SnapshotRow } from "@/lib/dashboard/store";

export function buildExecutiveScorecardPdf(params: {
  orgName: string;
  generatedAt: string;
  metrics: LiveDashboardMetrics;
  trend: SnapshotRow[];
  velocity: VelocityWeek[];
}): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFontSize(18);
  doc.text("Route5 — Executive scorecard", 48, y);
  y += 28;
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Organization: ${params.orgName}`, 48, y);
  y += 16;
  doc.text(`Generated: ${params.generatedAt}`, 48, y);
  y += 28;
  doc.setTextColor(0);

  doc.setFontSize(12);
  doc.text("Execution metrics", 48, y);
  y += 18;
  doc.setFontSize(10);
  const m = params.metrics;
  const lines = [
    `Health score: ${m.healthScore} (${m.healthTier})`,
    `Active commitments: ${m.activeCount}`,
    `On track: ${m.onTrackCount} · At risk: ${m.atRiskCount} · Overdue: ${m.overdueCount}`,
    `Completed this week: ${m.completedWeekCount} · Completed this month: ${m.completedMonthCount}`,
  ];
  for (const line of lines) {
    doc.text(line, 48, y);
    y += 14;
  }
  y += 12;

  if (params.trend.length >= 2) {
    doc.setFontSize(12);
    doc.text("Health score trend (snapshots)", 48, y);
    y += 16;
    const pad = 48;
    const chartW = pageW - pad * 2;
    const chartH = 80;
    const baseY = y + chartH;
    const xs = params.trend.map((_, i) => pad + (i / Math.max(1, params.trend.length - 1)) * chartW);
    const scores = params.trend.map((t) => t.health_score);
    const minS = Math.min(...scores, 0);
    const maxS = Math.max(...scores, 100);
    const span = Math.max(1, maxS - minS);
    doc.setDrawColor(180);
    doc.rect(pad, y, chartW, chartH);
    for (let i = 0; i < params.trend.length - 1; i++) {
      const y1 = baseY - ((scores[i] - minS) / span) * (chartH - 8);
      const y2 = baseY - ((scores[i + 1] - minS) / span) * (chartH - 8);
      doc.setDrawColor(40, 120, 200);
      doc.line(xs[i], y1, xs[i + 1], y2);
    }
    y += chartH + 24;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Trend data builds over time as daily snapshots are recorded.", 48, y);
    doc.setTextColor(0);
    y += 28;
  }

  doc.setFontSize(12);
  doc.text("Team performance", 48, y);
  y += 8;
  autoTable(doc, {
    startY: y + 8,
    head: [["Name", "Total", "On time", "Rate %", "Overdue"]],
    body: m.teamBreakdown.map((t) => [
      t.displayName,
      String(t.total),
      String(t.completedOnTime),
      String(t.completionRate),
      String(t.overdueCount),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 50] },
    margin: { left: 48, right: 48 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  if (y > 680) {
    doc.addPage();
    y = 48;
  }
  doc.setFontSize(12);
  doc.text("Decision velocity (last 12 weeks)", 48, y);
  y += 14;
  autoTable(doc, {
    startY: y + 8,
    head: [["Week of", "Commitments created"]],
    body: params.velocity.map((v) => [v.weekLabel, String(v.count)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 50] },
    margin: { left: 48, right: 48 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

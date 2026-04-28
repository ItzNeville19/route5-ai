"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Download, Maximize2, Minimize2 } from "lucide-react";
import type { ActivitySeriesByRange, ChartTimeRange } from "@/lib/workspace-summary";

const RANGE_ORDER: ChartTimeRange[] = ["7d", "30d", "90d", "1y", "all"];

const RANGE_LABEL: Record<ChartTimeRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "1y": "12 mo",
  all: "All time",
};

type Props = {
  seriesByRange: ActivitySeriesByRange;
  extractionCount: number;
  /** Pro+ — hide SVG download on Free when false. */
  allowSvgExport?: boolean;
  compact?: boolean;
  /** Range pills, fullscreen, export */
  showControls?: boolean;
  /** `details` tucks controls behind a disclosure (cleaner Overview). */
  controlsStyle?: "toolbar" | "details";
  /** Controlled range (e.g. hero timeframe). Omit to use local state. */
  range?: ChartTimeRange;
  defaultRange?: ChartTimeRange;
  onRangeChange?: (r: ChartTimeRange) => void;
  /** When range is set from outside, hide duplicate range UI in details/toolbar. */
  hideRangePicker?: boolean;
  /**
   * `glass` — workspace tokens on light frosted surfaces (Reports, Overview).
   * `dark` — light-on-dark chrome for use inside a dark modal (tokens may not apply in portals).
   */
  chrome?: "glass" | "dark";
};

export default function ExecutionTrendChart({
  seriesByRange,
  extractionCount,
  allowSvgExport = true,
  compact = false,
  showControls = true,
  controlsStyle = "toolbar",
  range: rangeProp,
  defaultRange = "7d",
  onRangeChange,
  hideRangePicker = false,
  chrome = "glass",
}: Props) {
  const fillId = useId().replace(/:/g, "");
  const darkChrome = chrome === "dark";
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [rangeInternal, setRangeInternal] = useState<ChartTimeRange>(defaultRange);
  const controlled = rangeProp !== undefined;
  const range = controlled ? rangeProp : rangeInternal;
  const setRange = (r: ChartTimeRange) => {
    if (controlled) onRangeChange?.(r);
    else setRangeInternal(r);
  };
  const [hover, setHover] = useState<number | null>(null);
  const [fs, setFs] = useState(false);

  const series = seriesByRange[range];
  const runs = series.runs;
  const decisions = series.decisions;
  const labels = series.labels;
  const n = Math.max(1, runs.length);

  const maxY = Math.max(1, ...runs, ...decisions);

  const w = useMemo(() => {
    if (compact) return Math.max(260, 48 + n * 10);
    return Math.max(320, 56 + n * 11);
  }, [compact, n]);

  const h = compact ? 140 : 172;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 30;

  const xAt = useCallback(
    (i: number) => padL + (n <= 1 ? 0 : i / (n - 1)) * (w - padL - padR),
    [n, w, padL, padR]
  );
  const yAt = useCallback(
    (v: number) => padT + (1 - v / maxY) * (h - padT - padB),
    [maxY, h, padT, padB]
  );

  const runsPath = useMemo(() => {
    if (runs.length === 0) return "";
    if (runs.length === 1) {
      const x = xAt(0);
      const y = yAt(runs[0] ?? 0);
      return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return runs
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
      .join(" ");
  }, [runs, xAt, yAt]);

  const decPath = useMemo(() => {
    if (decisions.length === 0) return "";
    if (decisions.length === 1) {
      const x = xAt(0);
      const y = yAt(decisions[0] ?? 0);
      return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return decisions
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
      .join(" ");
  }, [decisions, xAt, yAt]);

  const toggleFs = useCallback(async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setFs(true);
      } else {
        await document.exitFullscreen();
        setFs(false);
      }
    } catch {
      setFs(Boolean(document.fullscreenElement));
    }
  }, []);

  const onFsChange = useCallback(() => {
    setFs(Boolean(document.fullscreenElement));
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [onFsChange]);

  const exportSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `route5-runs-${range}-${new Date().toISOString().slice(0, 10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [range]);

  if (extractionCount === 0) {
    return (
      <p className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-4 py-8 text-center text-[13px] text-[var(--workspace-muted-fg)]">
        No runs yet — capture on Desk to see trends.
      </p>
    );
  }

  if (n === 0 || runs.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-4 py-8 text-center text-[13px] text-[var(--workspace-muted-fg)]">
        Not enough history for this range yet.
      </p>
    );
  }

  const ariaRange = RANGE_LABEL[range];

  const gridStroke = darkChrome ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.09)";
  const decLineStroke = darkChrome ? "rgba(255,255,255,0.42)" : "rgba(91,33,182,0.42)";
  const cursorLineStroke = darkChrome ? "rgba(255,255,255,0.18)" : "rgba(91,33,182,0.25)";
  const tooltipFill = darkChrome ? "rgba(24,24,27,0.94)" : "rgba(255,255,255,0.96)";
  const tooltipStroke = darkChrome ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const tooltipLabelFill = darkChrome ? "rgb(212,212,216)" : "rgb(82,82,91)";
  const tooltipValueFill = darkChrome ? "rgb(196,181,253)" : "rgb(91,33,182)";

  const shell = darkChrome
    ? "border border-white/[0.08] bg-black/20"
    : "border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/85";
  const disclosure = darkChrome
    ? "rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-zinc-200"
    : "rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-3 py-2 text-[11px] font-medium text-[var(--workspace-muted-fg)] transition hover:border-[var(--workspace-border)] hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]";
  const innerPanel = darkChrome ? "rounded-xl border border-white/10 bg-black/30 p-2" : "rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-2";
  const tabBar = darkChrome
    ? "flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
    : "flex flex-wrap gap-1 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-1";
  const tabOn = darkChrome
    ? "bg-violet-500/35 text-white shadow-sm"
    : "bg-[var(--workspace-accent)]/18 text-[var(--workspace-accent)] shadow-sm";
  const tabOff = darkChrome
    ? "text-zinc-300 hover:bg-white/5 hover:text-zinc-200"
    : "text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]";
  const iconBtn = darkChrome
    ? "inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10"
    : "inline-flex items-center gap-1 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-2.5 py-1 text-[11px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]";
  const rangeHint = darkChrome ? "text-[10px] text-zinc-400" : "text-[10px] text-[var(--workspace-muted-fg)]";
  const axisLabel = darkChrome
    ? "mt-1 flex flex-wrap justify-between gap-x-0.5 gap-y-1 text-[8px] font-medium text-zinc-400"
    : "mt-1 flex flex-wrap justify-between gap-x-0.5 gap-y-1 text-[8px] font-medium text-[var(--workspace-muted-fg)]";
  const legendMuted = darkChrome ? "text-[10px] text-zinc-400" : "text-[10px] text-[var(--workspace-muted-fg)]";
  const dashLegend = darkChrome ? "border-white/45" : "border-[var(--workspace-muted-fg)]/50";

  return (
    <div
      ref={wrapRef}
      className={`relative w-full rounded-2xl ${shell} ${fs ? "flex min-h-0 flex-col p-6" : ""}`}
    >
      {showControls ? (
        controlsStyle === "details" ? (
          <details className="group mb-2">
            <summary
              className={`flex cursor-pointer list-none items-center justify-between gap-2 ${disclosure} [&::-webkit-details-marker]:hidden`}
            >
              <span>
                {hideRangePicker
                  ? allowSvgExport
                    ? "Export & full screen"
                    : "Full screen"
                  : allowSvgExport
                    ? "Range, export & full screen"
                    : "Range & full screen"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition group-open:rotate-180 ${darkChrome ? "text-zinc-300" : "text-[var(--workspace-muted-fg)]"}`}
                aria-hidden
              />
            </summary>
            <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 ${innerPanel}`}>
              {!hideRangePicker ? (
                <div className={tabBar} role="tablist" aria-label="Chart time range">
                  {RANGE_ORDER.map((r) => {
                    const on = range === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setRange(r)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                          on ? tabOn : tabOff
                        }`}
                      >
                        {RANGE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className={rangeHint}>Range is set above.</span>
              )}
              <div className="flex items-center gap-1">
                {allowSvgExport ? (
                  <button type="button" onClick={exportSvg} className={iconBtn}>
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    SVG
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void toggleFs()}
                  className={iconBtn}
                  title={fs ? "Exit full screen" : "Full screen"}
                >
                  {fs ? (
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {fs ? "Exit" : "Full"}
                </button>
              </div>
            </div>
          </details>
        ) : (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {!hideRangePicker ? (
              <div className={tabBar} role="tablist" aria-label="Chart time range">
                {RANGE_ORDER.map((r) => {
                  const on = range === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setRange(r)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        on ? tabOn : tabOff
                      }`}
                    >
                      {RANGE_LABEL[r]}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className={rangeHint}>Range is set above.</span>
            )}
            <div className="flex items-center gap-1">
              {allowSvgExport ? (
                <button type="button" onClick={exportSvg} className={iconBtn}>
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  SVG
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void toggleFs()}
                className={iconBtn}
                title={fs ? "Exit full screen" : "Full screen"}
              >
                {fs ? (
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                )}
                {fs ? "Exit" : "Full"}
              </button>
            </div>
          </div>
        )
      ) : null}

      <div className={fs ? "min-h-0 flex-1 overflow-auto" : ""}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          className="w-full overflow-visible"
          role="img"
          aria-label={`Runs and decisions — ${ariaRange}, UTC`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(167,139,250)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(91,33,182)" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padL}
              x2={w - padR}
              y1={padT + t * (h - padT - padB)}
              y2={padT + t * (h - padT - padB)}
              stroke={gridStroke}
              strokeWidth="1"
            />
          ))}
          {runs.length > 1 && (
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              d={`${runsPath} L ${xAt(runs.length - 1)} ${h - padB} L ${xAt(0)} ${h - padB} Z`}
              fill={`url(#${fillId})`}
            />
          )}
          <motion.path
            d={decPath}
            fill="none"
            stroke={decLineStroke}
            strokeWidth="2"
            strokeDasharray="6 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.path
            d={runsPath}
            fill="none"
            stroke="rgb(196,181,253)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
          />
          {runs.map((_, i) => (
            <circle
              key={i}
              cx={xAt(i)}
              cy={yAt(runs[i] ?? 0)}
              r={hover === i ? 5 : 3.5}
              fill={hover === i ? "rgb(196,181,253)" : "rgb(139,92,246)"}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="1"
              className="cursor-crosshair"
              onMouseEnter={() => setHover(i)}
            />
          ))}
          {hover !== null && labels[hover] ? (
            <g>
              <line
                x1={xAt(hover)}
                x2={xAt(hover)}
                y1={padT}
                y2={h - padB}
                stroke={cursorLineStroke}
                strokeDasharray="4 4"
              />
              <rect
                x={Math.min(w - 128, Math.max(6, xAt(hover) - 62))}
                y={6}
                width={120}
                height={44}
                rx="8"
                fill={tooltipFill}
                stroke={tooltipStroke}
              />
              <text
                x={Math.min(w - 120, Math.max(14, xAt(hover) - 54))}
                y={22}
                fill={tooltipLabelFill}
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {labels[hover]}
              </text>
              <text
                x={Math.min(w - 120, Math.max(14, xAt(hover) - 54))}
                y={40}
                fill={tooltipValueFill}
                fontSize="11"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {runs[hover] ?? 0} runs · {decisions[hover] ?? 0} decisions
              </text>
            </g>
          ) : null}
        </svg>
        <div
          className={`${axisLabel} ${n > 14 ? "text-[7px]" : ""}`}
        >
          {labels.map((lb, i) => (
            <span key={`${lb}-${i}`} className="min-w-0 flex-1 text-center leading-tight">
              {lb.split(" ").slice(0, 2).join(" ")}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--workspace-muted-fg)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-gradient-to-r from-violet-600 to-violet-300" />
          Runs
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-px w-6 border-t-2 border-dashed ${dashLegend}`} />
          Decisions
        </span>
        <span className={legendMuted}>UTC · {RANGE_LABEL[range]}</span>
      </div>
    </div>
  );
}

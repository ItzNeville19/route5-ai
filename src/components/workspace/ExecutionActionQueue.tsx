"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

type AgentAction = {
  commitmentId: string;
  ownerId: string;
  title: string;
  severity: "warning" | "urgent" | "critical" | "overdue";
  kind: "owner_nudge" | "escalate";
  message: string;
};

type AgentMode = "suggest_then_approve" | "auto_send_limited" | "fully_automatic";

function keyFor(action: AgentAction) {
  return `${action.kind}:${action.commitmentId}:${action.severity}`;
}

function whyFlagged(action: AgentAction): string {
  if (action.kind === "escalate") {
    return `No matching escalation record — recommend escalation (${action.severity}).`;
  }
  if (action.severity === "overdue") return "Past deadline with incomplete status.";
  if (action.severity === "critical") return "Due window critical — stalled progress.";
  if (action.severity === "urgent") return "Deadline approaching — missing recent update.";
  return "Momentum vs. deadline skew — preventive nudge.";
}

function confidencePct(action: AgentAction): number {
  const rank: Record<AgentAction["severity"], number> = {
    overdue: 96,
    critical: 88,
    urgent: 74,
    warning: 58,
  };
  return rank[action.severity];
}

function initialsFromOwner(title: string, ownerId: string) {
  const t = title.slice(0, 1).toUpperCase();
  return t || ownerId.slice(-2).toUpperCase();
}

export default function ExecutionActionQueue() {
  const [mode, setMode] = useState<AgentMode>("suggest_then_approve");
  const [canRun, setCanRun] = useState(false);
  const [preview, setPreview] = useState<AgentAction[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<"all" | AgentAction["severity"]>("all");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<
    Array<{ id: string; severity: string; ownerDisplayName: string; commitmentTitle: string; ageHours: number }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/agent/commitment-ops/state", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        canRun?: boolean;
        policy?: { mode?: AgentMode };
      };
      if (cancelled) return;
      setCanRun(Boolean(res.ok && data.canRun));
      if (data.policy?.mode) setMode(data.policy.mode);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/escalations?resolved=all&limit=15", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as {
      escalations?: Array<{
        id: string;
        severity: string;
        ownerDisplayName: string;
        commitmentTitle: string;
        ageHours: number;
      }>;
    };
    if (res.ok) setHistory(data.escalations ?? []);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function saveMode(next: AgentMode) {
    setMode(next);
    await fetch("/api/agent/commitment-ops/config", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
  }

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/agent/commitment-ops/run", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: { created: number; upgraded: number; actionsSuggested?: number; actionsExecuted?: number };
      };
      if (res.ok && data.summary) {
        setToast(
          `Scan complete · +${data.summary.created} escalations · ${data.summary.actionsSuggested ?? 0} suggestions · ${data.summary.actionsExecuted ?? 0} auto-executed`
        );
      }
      await refreshQueue();
      await loadHistory();
    } finally {
      setRunning(false);
    }
  }

  const refreshQueue = useCallback(async () => {
    const res = await fetch("/api/agent/commitment-ops/preview", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as { actions?: AgentAction[] };
    const actions = res.ok ? (data.actions ?? []) : [];
    setPreview(actions);
    setSelected(actions.map((action) => keyFor(action)));
    setEditing(Object.fromEntries(actions.map((action) => [keyFor(action), action.message])));
  }, []);

  async function executeApproved() {
    const approved = preview
      .filter((action) => selected.includes(keyFor(action)))
      .map((action) => ({ ...action, message: editing[keyFor(action)] ?? action.message }));
    if (approved.length === 0) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/agent/commitment-ops/execute", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: approved }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: { executed: number; nudgesSent: number; escalationsCreated: number; escalationsUpgraded: number };
      };
      if (res.ok && data.summary) {
        setToast(
          `Sent ${data.summary.executed} · ${data.summary.nudgesSent} nudges · ${data.summary.escalationsCreated} new · ${data.summary.escalationsUpgraded} upgraded`
        );
        await refreshQueue();
        await loadHistory();
      }
    } finally {
      setExecuting(false);
    }
  }

  async function executeSingle(action: AgentAction) {
    setExecuting(true);
    try {
      const payload = [{ ...action, message: editing[keyFor(action)] ?? action.message }];
      const res = await fetch("/api/agent/commitment-ops/execute", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: payload }),
      });
      if (res.ok) {
        setToast("Action delivered.");
        setPreview((prev) => prev.filter((item) => keyFor(item) !== keyFor(action)));
        setSelected((prev) => prev.filter((item) => item !== keyFor(action)));
        await loadHistory();
      }
    } finally {
      setExecuting(false);
    }
  }

  useEffect(() => {
    if (!canRun) return;
    void refreshQueue();
  }, [canRun, refreshQueue]);

  const approvedCount = useMemo(
    () => preview.filter((action) => selected.includes(keyFor(action))).length,
    [preview, selected]
  );

  const visibleRows = useMemo(
    () => preview.filter((row) => severityFilter === "all" || row.severity === severityFilter),
    [preview, severityFilter]
  );

  const inboxStats = useMemo(() => {
    const critical = preview.filter((p) => p.severity === "overdue" || p.severity === "critical").length;
    return { total: preview.length, critical };
  }, [preview]);

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-8 animate-[route5-page-enter_0.35s_ease-out_both]">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[28px] border border-emerald-500/15 bg-[linear-gradient(125deg,rgba(12,42,28,0.55),rgba(8,10,9,0.98))] p-6 md:p-8 shadow-[0_40px_120px_-64px_rgba(16,185,129,0.4)]">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/95">
              <Sparkles className="h-3.5 w-3.5" />
              Operations copilot
            </div>
            <h1 className="mt-4 text-[clamp(1.65rem,3vw,2.15rem)] font-semibold tracking-tight text-white">
              Execution recovery inbox
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              Spot stalled commitments, preview outbound nudges, approve edits, and send — everything ties back to live org
              data and escalation policy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PolicySelect value={mode} onChange={(v) => void saveMode(v)} disabled={!canRun} />
            <button
              type="button"
              onClick={() => void runNow()}
              disabled={!canRun || running}
              className="route5-pressable inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-950/50 px-4 py-2 text-sm font-semibold text-emerald-50 disabled:opacity-40"
            >
              <Zap className="h-4 w-4" />
              {running ? "Scanning…" : "Run recovery scan"}
            </button>
            <button
              type="button"
              onClick={() => void refreshQueue()}
              disabled={!canRun}
              className="route5-pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          <MetricCard icon={Bot} label="Inbox" value={inboxStats.total} subtitle="Suggested actions" />
          <MetricCard icon={AlertOctagon} label="Hot" value={inboxStats.critical} subtitle="Overdue + critical" accent />
          <MetricCard icon={Shield} label="Approved batch" value={approvedCount} subtitle="Ready to send" />
        </div>

        {toast ? (
          <p className="relative mt-6 rounded-xl border border-emerald-500/25 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-100/95">
            {toast}
          </p>
        ) : null}
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={severityFilter === "all"} onClick={() => setSeverityFilter("all")}>
            All
          </FilterChip>
          {(["overdue", "critical", "urgent", "warning"] as const).map((sev) => (
            <FilterChip key={sev} active={severityFilter === sev} onClick={() => setSeverityFilter(sev)}>
              {sev}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void executeApproved()}
            disabled={!canRun || approvedCount === 0 || executing}
            className="route5-pressable inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-900/45 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_-18px_rgba(16,185,129,0.55)] disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {executing ? "Sending…" : `Send approved (${approvedCount})`}
          </button>
          <Link
            href="/workspace/dashboard"
            className="route5-pressable inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/75 hover:border-white/25 hover:text-white"
          >
            Back to command center
          </Link>
        </div>
      </div>

      {/* Inbox */}
      <div className="space-y-3">
        {visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/25 px-6 py-16 text-center">
            <p className="text-sm font-medium text-white">Inbox clear</p>
            <p className="mt-2 text-sm text-white/45">
              Run a recovery scan or loosen filters — nothing matched this severity bucket.
            </p>
          </div>
        ) : (
          visibleRows.map((action) => {
            const key = keyFor(action);
            const checked = selected.includes(key);
            const open = expanded[key] ?? false;
            return (
              <article
                key={key}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(165deg,rgba(18,26,20,0.96),rgba(9,11,10,0.98))] shadow-[0_28px_90px_-52px_rgba(0,0,0,0.85)] transition-[border-color,box-shadow] duration-300 hover:border-emerald-500/25 hover:shadow-[0_28px_90px_-48px_rgba(16,185,129,0.18)]"
              >
                <div className="flex flex-wrap items-start gap-4 p-4 md:p-5">
                  <label className="flex shrink-0 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      className="sr-only"
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...new Set([...prev, key])] : prev.filter((x) => x !== key)
                        )
                      }
                    />
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                        checked ? "border-emerald-400/70 bg-emerald-950/80 text-emerald-100" : "border-white/15 bg-black/40 text-white/35"
                      }`}
                    >
                      {checked ? <CheckCircle2 className="h-4 w-4" /> : initialsFromOwner(action.title, action.ownerId)}
                    </span>
                  </label>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={action.severity} />
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                        {action.kind === "owner_nudge" ? "Nudge owner" : "Escalate"}
                      </span>
                      <span className="text-[11px] tabular-nums text-emerald-400/85">{confidencePct(action)}% signal</span>
                    </div>
                    <h3 className="text-base font-semibold leading-snug text-white">{action.title}</h3>
                    <p className="text-[13px] leading-relaxed text-white/55">{whyFlagged(action)}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [key]: !open }))}
                        className="route5-pressable inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-semibold text-white/75"
                      >
                        {open ? (
                          <>
                            Hide preview <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Preview message <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void executeSingle(action)}
                        disabled={executing}
                        className="route5-pressable inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-950/45 px-3 py-1 text-[11px] font-semibold text-emerald-50 disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreview((prev) => prev.filter((row) => keyFor(row) !== key));
                          setSelected((prev) => prev.filter((x) => x !== key));
                        }}
                        className="route5-pressable inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-950/35 px-3 py-1 text-[11px] font-semibold text-red-100/95"
                      >
                        <X className="h-3.5 w-3.5" />
                        Dismiss
                      </button>
                    </div>
                  </div>

                  <div className="hidden w-36 shrink-0 flex-col items-end gap-2 md:flex">
                    <ConfidenceMeter value={confidencePct(action)} />
                    <span className="flex items-center gap-1 text-[11px] text-white/35">
                      <Clock className="h-3 w-3" /> Live org scope
                    </span>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-white/10 bg-black/35 px-4 py-4 md:px-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Outbound copy</p>
                    <textarea
                      value={editing[key] ?? action.message}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="mt-2 min-h-[100px] w-full resize-y rounded-xl border border-emerald-500/20 bg-[#070a09] px-3 py-2.5 text-sm leading-relaxed text-emerald-50/95 outline-none ring-0 placeholder:text-white/25 focus:border-emerald-400/45"
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {/* History */}
      <section className="rounded-[22px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Escalation & recovery history</h2>
          <Link href="/workspace/activity" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            Full timeline →
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-white/10">
          {history.length === 0 ? (
            <li className="py-6 text-center text-sm text-white/45">No escalation records yet.</li>
          ) : (
            history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-white">{item.commitmentTitle}</p>
                  <p className="mt-1 text-[12px] text-white/45">
                    {item.ownerDisplayName} · open {item.ageHours}h · {item.severity}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function PolicySelect({
  value,
  onChange,
  disabled,
}: {
  value: AgentMode;
  onChange: (v: AgentMode) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AgentMode)}
      className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white outline-none focus:border-emerald-500/45 disabled:opacity-40"
    >
      <option value="suggest_then_approve">Approve before send</option>
      <option value="auto_send_limited">Limited auto-send</option>
      <option value="fully_automatic">Full automation</option>
    </select>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        accent ? "border-red-500/25 bg-red-950/35" : "border-white/10 bg-black/35"
      }`}
    >
      <Icon className={`h-5 w-5 ${accent ? "text-red-400/85" : "text-emerald-400/85"}`} />
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[11px] text-white/45">{subtitle}</p>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active ? "border-emerald-500/45 bg-emerald-950/50 text-emerald-100" : "border-white/10 bg-black/25 text-white/55 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function SeverityBadge({ severity }: { severity: AgentAction["severity"] }) {
  const styles: Record<AgentAction["severity"], string> = {
    overdue: "border-red-500/40 bg-red-950/50 text-red-100",
    critical: "border-orange-500/40 bg-orange-950/45 text-orange-100",
    urgent: "border-amber-500/35 bg-amber-950/40 text-amber-100",
    warning: "border-slate-500/35 bg-slate-950/40 text-slate-200",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="w-full max-w-[140px] space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-[10px] text-right text-white/40">Confidence {value}%</p>
    </div>
  );
}

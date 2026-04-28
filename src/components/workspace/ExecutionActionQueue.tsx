"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
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
    return "This should be flagged to leadership so nothing slips.";
  }
  if (action.severity === "overdue") return "Past due and still open.";
  if (action.severity === "critical") return "Due very soon — needs an update now.";
  if (action.severity === "urgent") return "Deadline coming up — check in with the owner.";
  return "Looks quiet compared to the deadline — a light nudge may help.";
}

function priorityScore(action: AgentAction): number {
  const rank: Record<AgentAction["severity"], number> = {
    overdue: 96,
    critical: 88,
    urgent: 74,
    warning: 58,
  };
  return rank[action.severity];
}

function matchesMissionTab(action: AgentAction, tab: string): boolean {
  switch (tab) {
    case "all":
      return true;
    case "stale":
      return action.severity === "warning";
    case "followups":
      return action.severity === "urgent";
    case "blockers":
      return action.severity === "overdue" || action.severity === "critical";
    case "escalations":
      return action.kind === "escalate";
    case "pending":
      return action.kind === "owner_nudge";
    default:
      return true;
  }
}

function initialsFromOwner(title: string, ownerId: string) {
  const t = title.slice(0, 1).toUpperCase();
  return t || ownerId.slice(-2).toUpperCase();
}

export default function ExecutionActionQueue({
  variant = "page",
  missionTab = "all",
}: {
  variant?: "page" | "sheet";
  missionTab?: string;
}) {
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const singleFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (variant === "sheet") setSeverityFilter("all");
  }, [variant, missionTab]);

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
          `Scan done — ${data.summary.actionsSuggested ?? 0} suggestions ready (${data.summary.created ?? 0} new flags).`
        );
      }
      await refreshQueue();
      void loadHistory();
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
    const merged = preview
      .filter((action) => selected.includes(keyFor(action)))
      .map((action) => ({ ...action, message: editing[keyFor(action)] ?? action.message }));
    const seen = new Set<string>();
    const approved = merged.filter((action) => {
      const k = `${action.kind}:${action.commitmentId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
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
          `Sent ${data.summary.executed} — ${data.summary.nudgesSent} reminders and ${data.summary.escalationsCreated + data.summary.escalationsUpgraded} leadership flags.`
        );
        await refreshQueue();
        void loadHistory();
      }
    } finally {
      setExecuting(false);
    }
  }

  async function executeSingle(action: AgentAction) {
    const flightKey = `${action.kind}:${action.commitmentId}`;
    if (singleFlightRef.current.has(flightKey)) return;
    singleFlightRef.current.add(flightKey);
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
        setToast("Sent.");
        setPreview((prev) => prev.filter((item) => keyFor(item) !== keyFor(action)));
        setSelected((prev) => prev.filter((item) => item !== keyFor(action)));
        void loadHistory();
      }
    } finally {
      singleFlightRef.current.delete(flightKey);
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

  const visibleRows = useMemo(() => {
    let rows = preview;
    if (variant === "sheet" && missionTab && missionTab !== "all") {
      rows = rows.filter((row) => matchesMissionTab(row, missionTab));
    }
    return rows.filter((row) => severityFilter === "all" || row.severity === severityFilter);
  }, [preview, severityFilter, variant, missionTab]);

  const inboxStats = useMemo(() => {
    const critical = preview.filter((p) => p.severity === "overdue" || p.severity === "critical").length;
    return { total: preview.length, critical };
  }, [preview]);

  const sheetShell = variant === "sheet";

  return (
    <div
      className={`route5-agent-queue mx-auto w-full max-w-[1480px] space-y-4 animate-[route5-page-enter_0.35s_ease-out_both] ${sheetShell ? "pb-4" : "pb-10"}`}
    >
      {/* Summary — inbox-first */}
      <header
        className={`relative overflow-hidden rounded-[26px] border border-white/[0.06] bg-[linear-gradient(128deg,rgba(8,40,52,0.42),rgba(5,12,18,0.98))] shadow-[0_36px_100px_-60px_rgba(14,116,144,0.35)] ${sheetShell ? "p-4 md:p-5" : "p-6 md:p-8"}`}
      >
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/22 bg-cyan-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/92">
              <Sparkles className="h-3.5 w-3.5" />
              Inbox
            </div>
            <h1 className={`mt-4 font-semibold tracking-tight text-white ${sheetShell ? "text-xl md:text-[1.35rem]" : "text-[clamp(1.55rem,2.8vw,2.05rem)]"}`}>
              Conversational follow-ups
            </h1>
            {!sheetShell ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/[0.55]">
                Work through suggestions like an inbox — expand a row to edit the outgoing note, approve with the checkbox,
                then send approved items in one batch or one at a time.
              </p>
            ) : (
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/[0.5]">
                Preview messages, approve, then send — same pipeline as the full Agent page.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <PolicySelect value={mode} onChange={(v) => void saveMode(v)} disabled={!canRun} />
            <button
              type="button"
              onClick={() => void runNow()}
              disabled={!canRun || running}
              className="route5-pressable inline-flex items-center gap-2 rounded-full border border-cyan-500/32 bg-cyan-950/50 px-4 py-2 text-sm font-semibold text-cyan-50 disabled:opacity-40"
            >
              <Zap className="h-4 w-4" />
              {running ? "Scanning…" : "Scan team"}
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

        <div className={`relative grid gap-3 sm:grid-cols-3 ${sheetShell ? "mt-5" : "mt-8"}`}>
          <MetricCard icon={Bot} label="Inbox" value={inboxStats.total} subtitle="Current suggestions" />
          <MetricCard icon={AlertOctagon} label="Urgent" value={inboxStats.critical} subtitle="Late or critical" accent />
          <MetricCard icon={Shield} label="Ready to send" value={approvedCount} subtitle="Selected to send" />
        </div>

        {toast ? (
          <p className="relative mt-6 rounded-xl border border-cyan-500/22 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-50/96">
            {toast}
          </p>
        ) : null}
      </header>

      {/* Filters + bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/[0.065] bg-black/24 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {!sheetShell ? (
            <>
              <FilterChip active={severityFilter === "all"} onClick={() => setSeverityFilter("all")}>
                All
              </FilterChip>
              {(["overdue", "critical", "urgent", "warning"] as const).map((sev) => (
                <FilterChip key={sev} active={severityFilter === sev} onClick={() => setSeverityFilter(sev)}>
                  {sev}
                </FilterChip>
              ))}
            </>
          ) : (
            <span className="text-[12px] font-medium text-white/42">
              Refine using tabs above · severity filters stay available on the full Agent page.
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void executeApproved()}
            disabled={!canRun || approvedCount === 0 || executing}
            className="route5-pressable inline-flex items-center gap-2 rounded-full border border-cyan-500/38 bg-cyan-900/45 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_-18px_rgba(8,145,178,0.45)] disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {executing ? "Sending…" : `Send approved (${approvedCount})`}
          </button>
          <Link
            href="/workspace/assign-task"
            className="route5-pressable inline-flex items-center rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-cyan-100/92 hover:border-cyan-500/35 hover:bg-cyan-950/38"
          >
            Assign new work
          </Link>
          {!sheetShell ? (
            <Link
              href="/workspace/dashboard"
              className="route5-pressable inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/75 hover:border-white/25 hover:text-white"
            >
              Home
            </Link>
          ) : null}
        </div>
      </div>

      {/* Message rows */}
      <div className="space-y-3">
        {visibleRows.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-white/[0.1] bg-black/[0.18] px-6 py-14 text-center">
            <p className="text-sm font-medium text-white">You&apos;re caught up</p>
            <p className="mt-2 text-sm text-white/45">{!canRun ? "Agent tools unlock for admins and managers." : "Try another filter or run a scan — nothing matches."}</p>
          </div>
        ) : (
          visibleRows.map((action) => {
            const key = keyFor(action);
            const checked = selected.includes(key);
            const open = expanded[key] ?? false;
            return (
              <article
                key={key}
                className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(165deg,rgba(12,28,34,0.92),rgba(6,11,14,0.98))] shadow-[0_26px_88px_-56px_rgba(0,0,0,0.75)] transition-[border-color,box-shadow] duration-300 hover:border-cyan-500/22 hover:shadow-[0_28px_90px_-50px_rgba(14,116,144,0.15)]"
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
                        checked ? "border-cyan-400/65 bg-cyan-950/75 text-cyan-50" : "border-white/12 bg-black/38 text-white/35"
                      }`}
                    >
                      {checked ? <CheckCircle2 className="h-4 w-4" /> : initialsFromOwner(action.title, action.ownerId)}
                    </span>
                  </label>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={action.severity} />
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                        {action.kind === "owner_nudge" ? "Reminder" : "Escalate"}
                      </span>
                      <span className="text-[11px] tabular-nums text-cyan-400/82">Priority · {priorityScore(action)}%</span>
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
                        className="route5-pressable inline-flex items-center gap-1 rounded-full border border-cyan-500/34 bg-cyan-950/45 px-3 py-1 text-[11px] font-semibold text-cyan-50 disabled:opacity-40"
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
                    <ConfidenceMeter value={priorityScore(action)} />
                    <span className="flex items-center gap-1 text-[11px] text-white/35">
                      <Clock className="h-3 w-3" /> Listed
                    </span>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-white/10 bg-black/35 px-4 py-4 md:px-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Message</p>
                    <textarea
                      value={editing[key] ?? action.message}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="mt-2 min-h-[100px] w-full resize-y rounded-xl border border-cyan-500/22 bg-[#070b0f] px-3 py-2.5 text-sm leading-relaxed text-cyan-50/95 outline-none ring-0 placeholder:text-white/25 focus:border-cyan-400/42"
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {/* History — expandable so the inbox stays the focus */}
      {!sheetShell ? (
      <section className="rounded-[22px] border border-white/[0.06] bg-black/22 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="route5-pressable flex w-full items-center justify-between gap-3 rounded-[20px] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
          aria-expanded={historyOpen}
        >
          <span className="text-sm font-semibold text-white">Recent flags</span>
          <span className="flex items-center gap-3">
            {history.length > 0 ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white/60">
                {history.length}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-white/35">Empty</span>
            )}
            {historyOpen ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
          </span>
        </button>
        {historyOpen ? (
          <div className="border-t border-white/[0.05] px-4 pb-4 pt-1">
            <div className="mb-3 flex justify-end">
              <Link href="/workspace/activity" className="text-xs font-semibold text-cyan-400 hover:text-cyan-200">
                Full history →
              </Link>
            </div>
            <ul className="divide-y divide-white/[0.07]">
              {history.length === 0 ? (
                <li className="py-8 text-center text-sm text-white/45">Nothing flagged yet.</li>
              ) : (
                history.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1">
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
          </div>
        ) : null}
      </section>
      ) : null}
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
      className="rounded-full border border-white/12 bg-black/38 px-4 py-2 text-sm font-medium text-white outline-none focus:border-cyan-500/42 disabled:opacity-40"
    >
      <option value="suggest_then_approve">Ask me before sending</option>
      <option value="auto_send_limited">Send simple reminders automatically</option>
      <option value="fully_automatic">Send automatically when safe</option>
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
        accent ? "border-red-500/25 bg-red-950/35" : "border-white/[0.08] bg-black/32"
      }`}
    >
      <Icon className={`h-5 w-5 ${accent ? "text-red-400/85" : "text-cyan-400/82"}`} />
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
        active ? "border-cyan-500/40 bg-cyan-950/45 text-cyan-50" : "border-white/[0.08] bg-black/22 text-white/54 hover:border-white/16"
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
          className="h-full rounded-full bg-gradient-to-r from-cyan-700 to-cyan-400 transition-[width] duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-[10px] text-right text-white/40">Priority {value}%</p>
    </div>
  );
}

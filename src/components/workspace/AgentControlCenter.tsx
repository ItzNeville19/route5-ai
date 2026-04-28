"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function AgentControlCenter() {
  const [mode, setMode] = useState<AgentMode>("suggest_then_approve");
  const [canRun, setCanRun] = useState(false);
  const [preview, setPreview] = useState<AgentAction[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<"all" | AgentAction["severity"]>("all");
  const [editing, setEditing] = useState<Record<string, string>>({});
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/escalations?resolved=all&limit=10", {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        escalations?: Array<{
          id: string;
          severity: string;
          ownerDisplayName: string;
          commitmentTitle: string;
          ageHours: number;
        }>;
      };
      if (!cancelled && res.ok) {
        setHistory(data.escalations ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summary]);

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
        setSummary(
          `Run complete: +${data.summary.created} escalations, +${data.summary.upgraded} upgrades, ${data.summary.actionsSuggested ?? 0} suggested, ${data.summary.actionsExecuted ?? 0} executed.`
        );
      }
    } finally {
      setRunning(false);
    }
  }

  async function previewActions() {
    const res = await fetch("/api/agent/commitment-ops/preview", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as { actions?: AgentAction[] };
    const actions = data.actions ?? [];
    setPreview(actions);
    setSelected(actions.map((action) => keyFor(action)));
    setEditing(
      Object.fromEntries(actions.map((action) => [keyFor(action), action.message]))
    );
  }

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
        setSummary(
          `Executed ${data.summary.executed} actions (${data.summary.nudgesSent} nudges, ${data.summary.escalationsCreated} new escalations, ${data.summary.escalationsUpgraded} upgrades).`
        );
        setPreview([]);
        setSelected([]);
        setEditing({});
        void previewActions();
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
      const data = (await res.json().catch(() => ({}))) as {
        summary?: { executed: number; nudgesSent: number; escalationsCreated: number; escalationsUpgraded: number };
      };
      if (res.ok && data.summary) {
        setSummary(
          `Sent ${data.summary.executed} action (${data.summary.nudgesSent} nudges, ${data.summary.escalationsCreated} new escalations, ${data.summary.escalationsUpgraded} upgrades).`
        );
        setPreview((prev) => prev.filter((item) => keyFor(item) !== keyFor(action)));
        setSelected((prev) => prev.filter((item) => item !== keyFor(action)));
      }
    } finally {
      setExecuting(false);
    }
  }

  const approvedCount = useMemo(
    () => preview.filter((action) => selected.includes(keyFor(action))).length,
    [preview, selected]
  );
  const visibleRows = useMemo(
    () => preview.filter((row) => severityFilter === "all" || row.severity === severityFilter),
    [preview, severityFilter]
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] rounded-[28px] border border-[#2a3b2b] bg-[linear-gradient(180deg,#0b100c_0%,#111a11_100%)] p-5 text-white">
      <h1 className="text-2xl font-semibold">Action Queue</h1>
      <p className="mt-1 text-sm text-[#a6b7a5]">
        Operational queue for follow-ups, nudges, and escalations generated from real commitment risk signals.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-[#2f4630] bg-[#0f1610] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mode}
              onChange={(e) => void saveMode(e.target.value as AgentMode)}
              className="rounded-lg border border-[#2f4630] bg-[#0e1610] px-3 py-2 text-sm"
            >
              <option value="suggest_then_approve">Suggest + approve</option>
              <option value="auto_send_limited">Auto send limited</option>
              <option value="fully_automatic">Fully automatic</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as "all" | AgentAction["severity"])}
              className="rounded-lg border border-[#2f4630] bg-[#0e1610] px-3 py-2 text-sm"
            >
              <option value="all">All severity</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
              <option value="overdue">Overdue</option>
            </select>
            <button
              type="button"
              onClick={() => void runNow()}
              disabled={!canRun || running}
              className="route5-pressable rounded-lg border border-[#315633] bg-[#123417] px-3 py-2 text-sm font-semibold"
            >
              {running ? "Running..." : "Run agent"}
            </button>
            <button
              type="button"
              onClick={() => void previewActions()}
              disabled={!canRun}
              className="route5-pressable rounded-lg border border-[#315633] bg-[#122917] px-3 py-2 text-sm font-semibold"
            >
              Refresh queue
            </button>
            <button
              type="button"
              onClick={() => void executeApproved()}
              disabled={!canRun || approvedCount === 0 || executing}
              className="route5-pressable rounded-lg border border-[#376a3a] bg-[#195022] px-3 py-2 text-sm font-semibold"
            >
              {executing ? "Executing..." : `Send approved (${approvedCount})`}
            </button>
          </div>
          {summary ? (
            <p className="mt-3 rounded-lg border border-[#2f4630] bg-[#101911] p-3 text-sm">{summary}</p>
          ) : null}
        </section>
        <section className="rounded-xl border border-[#2f4630] bg-[#0f1610] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9ab09a]">Run history</p>
          <ul className="mt-2 space-y-1.5">
            {history.length === 0 ? (
              <li className="text-xs text-[#8ea28d]">No recent escalations yet.</li>
            ) : (
              history.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded border border-[#243624] px-2 py-1 text-xs">
                  <span className="text-[#dbead8]">
                    {item.commitmentTitle} · {item.ownerDisplayName}
                  </span>
                  <span className="text-[#9ab09a]">
                    {item.severity} · {item.ageHours}h
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {visibleRows.map((action) => {
          const key = keyFor(action);
          const checked = selected.includes(key);
          return (
            <li key={key} className="rounded-lg border border-[#2f4630] bg-[#101711] p-3">
              <label className="mb-1 flex items-center gap-2 text-xs text-[#b5c6b4]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...new Set([...prev, key])] : prev.filter((item) => item !== key)
                    )
                  }
                />
                Approve
              </label>
              <p className="text-sm font-semibold">{action.title}</p>
              <p className="mt-1 text-xs text-[#a6b7a5]">
                {action.kind.replaceAll("_", " ")} · {action.severity}
              </p>
              <textarea
                value={editing[key] ?? action.message}
                onChange={(e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))}
                className="mt-2 min-h-[72px] w-full rounded border border-[#2d4530] bg-[#0f1a11] p-2 text-xs text-[#d7e8d4]"
              />
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void executeSingle(action)}
                  className="route5-pressable rounded border border-[#2f5d35] bg-[#174024] px-2 py-1 text-[11px] font-medium text-[#d5f2da]"
                >
                  Send now
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
                    )
                  }
                  className="route5-pressable rounded border border-[#35503a] bg-[#132116] px-2 py-1 text-[11px] font-medium text-[#c4d8c3]"
                >
                  {checked ? "Unapprove" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreview((prev) => prev.filter((row) => keyFor(row) !== key));
                    setSelected((prev) => prev.filter((item) => item !== key));
                  }}
                  className="route5-pressable rounded border border-[#5a3737] bg-[#2a1414] px-2 py-1 text-[11px] font-medium text-[#e4c5c5]"
                >
                  Dismiss
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

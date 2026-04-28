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
  }

  async function executeApproved() {
    const approved = preview.filter((action) => selected.includes(keyFor(action)));
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
      }
    } finally {
      setExecuting(false);
    }
  }

  const approvedCount = useMemo(
    () => preview.filter((action) => selected.includes(keyFor(action))).length,
    [preview, selected]
  );

  return (
    <div className="mx-auto w-full max-w-[1180px] rounded-[28px] border border-[#2a3b2b] bg-[linear-gradient(180deg,#0b100c_0%,#111a11_100%)] p-5 text-white">
      <h1 className="text-2xl font-semibold">Agent Control Center</h1>
      <p className="mt-1 text-sm text-[#a6b7a5]">
        Real suggest-and-approve workflow for execution recovery actions.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => void saveMode(e.target.value as AgentMode)}
          className="rounded-lg border border-[#2f4630] bg-[#0e1610] px-3 py-2 text-sm"
        >
          <option value="suggest_then_approve">Suggest + approve</option>
          <option value="auto_send_limited">Auto send limited</option>
          <option value="fully_automatic">Fully automatic</option>
        </select>
        <button
          type="button"
          onClick={() => void runNow()}
          disabled={!canRun || running}
          className="rounded-lg border border-[#315633] bg-[#123417] px-3 py-2 text-sm font-semibold"
        >
          {running ? "Running..." : "Run agent now"}
        </button>
        <button
          type="button"
          onClick={() => void previewActions()}
          disabled={!canRun}
          className="rounded-lg border border-[#315633] bg-[#122917] px-3 py-2 text-sm font-semibold"
        >
          Preview actions
        </button>
        <button
          type="button"
          onClick={() => void executeApproved()}
          disabled={!canRun || approvedCount === 0 || executing}
          className="rounded-lg border border-[#376a3a] bg-[#195022] px-3 py-2 text-sm font-semibold"
        >
          {executing ? "Executing..." : `Execute approved (${approvedCount})`}
        </button>
      </div>

      {summary ? <p className="mt-3 rounded-lg border border-[#2f4630] bg-[#101911] p-3 text-sm">{summary}</p> : null}

      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {preview.map((action) => {
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
              <p className="mt-1 text-xs text-[#c8d8c6]">{action.message}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

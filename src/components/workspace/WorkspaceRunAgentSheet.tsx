"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ExecutionActionQueue from "@/components/workspace/ExecutionActionQueue";
import { useWorkspaceChromeActions } from "@/components/workspace/WorkspaceChromeActions";

const MISSION_TABS = [
  { id: "all", label: "Overview" },
  { id: "stale", label: "Stale recovery" },
  { id: "followups", label: "Follow-ups" },
  { id: "blockers", label: "Blockers" },
  { id: "escalations", label: "Escalations" },
  { id: "pending", label: "Pending sends" },
] as const;

export default function WorkspaceRunAgentSheet() {
  const { runAgentOpen, closeRunAgent } = useWorkspaceChromeActions();
  const searchParams = useSearchParams();
  const agentFullHref = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    const qs = p.toString();
    return qs ? `/workspace/agent?${qs}` : "/workspace/agent";
  }, [searchParams]);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<(typeof MISSION_TABS)[number]["id"]>("all");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!runAgentOpen) setTab("all");
  }, [runAgentOpen]);

  if (!mounted || !runAgentOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[82] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close Run Agent panel"
        onClick={() => closeRunAgent()}
      />
      <aside
        className="relative flex h-full w-full max-w-[min(100vw-12px,960px)] flex-col border-l border-emerald-500/14 bg-[linear-gradient(165deg,rgba(6,28,24,0.97),rgba(4,10,12,0.99))] shadow-[0_0_90px_-24px_rgba(16,185,129,0.38)]"
        role="dialog"
        aria-labelledby="run-agent-sheet-title"
      >
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/45">Agent</p>
            <h2 id="run-agent-sheet-title" className="mt-0.5 text-lg font-semibold text-white">
              Run Agent
            </h2>
            <p className="mt-1 max-w-xl text-[12px] leading-snug text-white/45">
              Scan, preview, and approve — the same work as the full Agent page, in a compact panel.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={agentFullHref}
              className="route5-pressable inline-flex items-center gap-1.5 rounded-full border border-cyan-500/28 bg-cyan-950/40 px-3 py-1.5 text-[12px] font-semibold text-cyan-50 hover:bg-cyan-900/38"
              onClick={() => closeRunAgent()}
            >
              Open full page <ExternalLink className="h-3.5 w-3.5 opacity-90" />
            </Link>
            <button
              type="button"
              onClick={() => closeRunAgent()}
              className="route5-pressable inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/35 text-white/70 hover:border-emerald-400/35 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="shrink-0 border-b border-white/[0.05] px-4 py-2 sm:px-5">
          <nav aria-label="Agent missions" className="flex flex-wrap gap-1.5">
            {MISSION_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`route5-pressable rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors sm:text-[12px] ${
                  tab === t.id
                    ? "border-emerald-400/45 bg-emerald-950/55 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "border-white/[0.08] bg-black/28 text-white/55 hover:border-emerald-400/28 hover:text-white/92"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          <ExecutionActionQueue variant="sheet" missionTab={tab} />
        </div>
      </aside>
    </div>,
    document.body
  );
}

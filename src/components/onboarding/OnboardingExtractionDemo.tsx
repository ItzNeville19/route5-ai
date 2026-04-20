"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Wand2 } from "lucide-react";
import type { Project } from "@/lib/types";

const DEMO_SAMPLE = `Weekly leadership sync — Route5 pilot
Sarah: We need the analytics cutover done before Friday board prep — owner: Sarah.
Mike: API latency is still spiking on /v1/commitments; fix before we widen the beta.
Decision: Freeze scope on the dashboard; defer mobile polish to the next sprint.
Open question: Do we block the release if Slack routing slips?`;

type ExtractJson = {
  extractionId?: string;
  summary?: string;
  problem?: string;
  solution?: string;
  openQuestions?: string[];
  decisions?: string[];
  actionItems?: { text: string; owner?: string | null }[];
  mode?: string;
  error?: string;
};

type Props = {
  /** Used when auto-creating the first project (workspace onboarding). */
  defaultProjectName?: string;
  /** Called when a real extraction completes (server persisted). */
  onExtractionComplete?: () => void;
  /** Visual variant for marketing vs workspace chrome tokens. */
  variant?: "marketing" | "workspace";
};

export default function OnboardingExtractionDemo({
  defaultProjectName = "Primary workspace",
  onExtractionComplete,
  variant = "marketing",
}: Props) {
  const [, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [rawInput, setRawInput] = useState(DEMO_SAMPLE);
  const [running, setRunning] = useState(false);
  const [runStage, setRunStage] = useState<0 | 1 | 2 | 3>(0);
  const [result, setResult] = useState<ExtractJson | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isWorkspace = variant === "workspace";

  const surface = isWorkspace
    ? "workspace-preview-panel p-4"
    : "rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-primary/50 p-[var(--r5-space-4)]";

  const labelMuted = isWorkspace ? "text-[var(--workspace-muted-fg)]" : "text-r5-text-secondary";
  const labelFg = isWorkspace ? "text-[var(--workspace-fg)]" : "text-r5-text-primary";
  const accentBtn = isWorkspace
    ? "rounded-xl bg-[var(--workspace-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-accent-fg)] disabled:opacity-50"
    : "rounded-[var(--r5-radius-pill)] bg-r5-accent px-[var(--r5-space-4)] py-2.5 text-[length:var(--r5-font-body)] font-semibold text-white disabled:opacity-50";

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { projects?: Project[] };
      const list = res.ok ? (data.projects ?? []) : [];
      setProjects(list);
      setProjectId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!running) {
      setRunStage(0);
      return;
    }
    setRunStage(1);
    const t1 = window.setTimeout(() => setRunStage(2), 550);
    const t2 = window.setTimeout(() => setRunStage(3), 1250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [running]);

  async function ensureProjectId(): Promise<string | null> {
    if (projectId) return projectId;
    setCreatingProject(true);
    setErr(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: defaultProjectName.trim() || "Primary workspace" }),
      });
      const data = (await res.json().catch(() => ({}))) as { project?: Project; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not create a project.");
      }
      if (data.project) {
        setProjects((p) => [...p, data.project!]);
        setProjectId(data.project.id);
        return data.project.id;
      }
      throw new Error("No project returned.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create a project.");
      return null;
    } finally {
      setCreatingProject(false);
    }
  }

  async function runExtraction() {
    setErr(null);
    setResult(null);
    if (!rawInput.trim()) {
      setErr("Add a short note to process.");
      return;
    }
    setRunning(true);
    try {
      const pid = await ensureProjectId();
      if (!pid) {
        setRunning(false);
        return;
      }
      const res = await fetch("/api/extract", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, rawInput: rawInput.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as ExtractJson;
      if (!res.ok) {
        throw new Error(data.error ?? "Processing failed.");
      }
      setResult(data);
      onExtractionComplete?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Processing failed.");
    } finally {
      setRunning(false);
    }
  }

  const actionItems = useMemo(() => result?.actionItems ?? [], [result]);

  return (
    <div className="space-y-4">
      <div className={`${surface} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className={`h-4 w-4 shrink-0 ${isWorkspace ? "text-[var(--workspace-accent)]" : "text-r5-accent"}`} />
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${labelMuted}`}>
            Live capture · same engine as Desk
          </p>
        </div>
        <p className={`text-[14px] leading-relaxed ${labelMuted}`}>
          Paste messy notes — Route5 turns them into a summary, decisions, and owned action items. This uses your workspace
          project and writes a real record you&apos;ll see on Desk.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 1, label: "Parse context" },
            { id: 2, label: "Detect decisions" },
            { id: 3, label: "Map actions" },
          ].map((s) => {
            const active = runStage >= (s.id as 1 | 2 | 3);
            return (
              <div
                key={s.id}
                className={`rounded-lg border px-2 py-2 text-center text-[11px] font-medium transition ${
                  active
                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-black/15 text-zinc-400"
                }`}
              >
                {s.label}
              </div>
            );
          })}
        </div>

        {loadingProjects ? (
          <div className="flex items-center gap-2 text-[13px] text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading projects…
          </div>
        ) : (
          <label className="block">
            <span className={`mb-1 block text-[12px] font-medium ${labelMuted}`}>Sample note (edit freely)</span>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={8}
              className={
                isWorkspace
                  ? "w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2 text-[13px] leading-relaxed text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)]"
                  : "w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-3)] py-[var(--r5-space-3)] text-[length:var(--r5-font-body)] text-r5-text-primary placeholder:text-r5-text-secondary"
              }
            />
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={running || loadingProjects || creatingProject}
            className={`inline-flex items-center gap-2 ${accentBtn}`}
            onClick={() => void runExtraction()}
          >
            {running || creatingProject ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="h-4 w-4" aria-hidden />
            )}
            {creatingProject ? "Preparing project…" : running ? "Processing…" : "Process note"}
          </button>
          {!projectId && !loadingProjects ? (
            <span className={`self-center text-[12px] ${labelMuted}`}>
              We&apos;ll create &quot;{defaultProjectName}&quot; if you don&apos;t have a project yet.
            </span>
          ) : null}
        </div>

        {err ? (
          <p className="text-[13px] text-red-400" role="alert">
            {err}
          </p>
        ) : null}
      </div>

      {result ? (
        <div
          className={
            isWorkspace
              ? "workspace-preview-panel border-emerald-500/25 bg-emerald-500/[0.08] p-4"
              : "rounded-[var(--r5-radius-lg)] border border-emerald-500/25 bg-emerald-500/[0.07] p-[var(--r5-space-4)]"
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
            <p className={`text-[13px] font-semibold ${labelFg}`}>Saved to your workspace</p>
            {result.mode ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300">
                {result.mode === "ai" ? "Model" : "Structured offline"}
              </span>
            ) : null}
          </div>
          {result.summary ? (
            <p className={`mt-3 text-[14px] leading-relaxed ${labelFg}`}>{result.summary}</p>
          ) : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>Summary</p>
              <p className="mt-1 text-[13px] text-zinc-100">{result.summary ? "Generated" : "Pending"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>Decisions</p>
              <p className="mt-1 text-[13px] text-zinc-100">{result.decisions?.length ?? 0}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>Action items</p>
              <p className="mt-1 text-[13px] text-zinc-100">{actionItems.length}</p>
            </div>
          </div>
          {result.decisions?.length ? (
            <div className="mt-3">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>Decisions</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-zinc-200">
                {result.decisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {actionItems.length > 0 ? (
            <div className="mt-3">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>Action items</p>
              <ul className="mt-1 space-y-2">
                {actionItems.map((a, idx) => (
                  <li
                    key={`${a.text}-${idx}`}
                    className="flex gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-[13px] text-zinc-100"
                  >
                    <span className="font-mono text-[11px] text-zinc-500">{idx + 1}</span>
                    <span>
                      {a.text}
                      {a.owner ? (
                        <span className="ml-2 text-[12px] text-zinc-400">— {a.owner}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className={`mt-3 text-[12px] ${labelMuted}`}>
            Open <span className="font-medium text-zinc-200">Desk</span> to see this alongside the rest of your commitments.
          </p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Download,
  Filter,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Trash2,
} from "lucide-react";
import type { Extraction, Project } from "@/lib/types";
import InputPanel from "@/components/app/InputPanel";
import DeleteProjectDialog from "@/components/app/DeleteProjectDialog";
import ExtractionCard from "@/components/app/ExtractionCard";
import WorkspacePreviewPane from "@/components/app/WorkspacePreviewPane";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { getExtractionPreset } from "@/lib/extraction-presets";
import { consumeExtractionDraft } from "@/lib/workspace-bridge";
import { loadScratch, saveScratch } from "@/lib/workspace-prefs";

type Props = { projectId: string };

export default function ProjectDashboard({ projectId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { pushToast } = useWorkspaceExperience();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [filterQ, setFilterQ] = useState("");
  const [scratchOpen, setScratchOpen] = useState(false);
  const [scratch, setScratch] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setListErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        project?: Project;
        extractions?: Extraction[];
      };
      if (!res.ok) {
        setProject(null);
        setExtractions([]);
        if (res.status === 404) {
          setListErr(null);
        } else {
          setListErr(data.error ?? "Could not load project.");
        }
        return;
      }
      if (data.project) {
        setProject(data.project);
        setEditName(data.project.name);
        setEditEmoji(data.project.iconEmoji ?? "");
      } else {
        setProject(null);
      }
      setExtractions(data.extractions ?? []);
    } catch {
      setProject(null);
      setExtractions([]);
      setListErr("Could not load project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const draft = searchParams.get("draft") === "1";
    const presetId = searchParams.get("preset");
    if (draft) {
      const d = consumeExtractionDraft();
      if (d?.body) {
        setPrefill(d.body);
        pushToast("Imported.", "success");
      }
      router.replace(`/projects/${projectId}`, { scroll: false });
      return;
    }
    if (presetId) {
      const p = getExtractionPreset(presetId);
      if (p) {
        setPrefill(p.body);
        pushToast(`${p.label}`, "info");
      }
      router.replace(`/projects/${projectId}`, { scroll: false });
    }
  }, [searchParams, pushToast, router, projectId]);

  useEffect(() => {
    setScratch(loadScratch(projectId));
  }, [projectId]);

  useEffect(() => {
    if (extractions.length === 0) {
      setSelectedExtractionId(null);
      return;
    }
    setSelectedExtractionId((prev) => {
      if (prev && extractions.some((e) => e.id === prev)) return prev;
      return extractions[0].id;
    });
  }, [extractions]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#ex-")) return;
    const domId = hash.slice(1);
    const extractionId = domId.startsWith("ex-") ? domId.slice(3) : domId;
    if (extractions.some((e) => e.id === extractionId)) {
      setSelectedExtractionId(extractionId);
    }
    window.setTimeout(() => {
      document.getElementById(domId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [extractions, loading]);

  function updateExtraction(extractionId: string, updater: (ex: Extraction) => Extraction) {
    setExtractions((prev) => prev.map((ex) => (ex.id === extractionId ? updater(ex) : ex)));
  }

  const filteredExtractions = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    if (!q) return extractions;
    return extractions.filter((ex) => {
      const blob = [
        ex.summary,
        ex.rawInput,
        ...ex.decisions,
        ...ex.actionItems.map((a) => a.text),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [extractions, filterQ]);

  const openActionsText = useMemo(() => {
    const lines: string[] = [];
    for (const ex of extractions) {
      for (const a of ex.actionItems) {
        if (!a.completed) lines.push(`• ${a.text}`);
      }
    }
    return lines.join("\n");
  }, [extractions]);

  async function copyOpenActions() {
    if (!openActionsText.trim()) {
      pushToast("Nothing open.", "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(openActionsText);
      pushToast("Copied.", "success");
    } catch {
      pushToast("Clipboard blocked — select and copy manually.", "error");
    }
  }

  function exportProjectJson() {
    if (!project) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      project,
      extractions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/[^\w\-]+/g, "-").slice(0, 40) || "project"}-export.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    pushToast("Exported.", "success");
  }

  function persistScratch(next: string) {
    setScratch(next);
    saveScratch(projectId, next);
  }

  async function saveProjectIdentity() {
    const name = editName.trim();
    if (!name) {
      pushToast("Project name is required.", "error");
      return;
    }
    setSavingIdentity(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          iconEmoji: editEmoji.trim() === "" ? null : editEmoji,
        }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        project?: Project;
      };
      if (!res.ok || !data.project) {
        pushToast(data.error ?? "Could not save.", "error");
        return;
      }
      setProject(data.project);
      setEditName(data.project.name);
      setEditEmoji(data.project.iconEmoji ?? "");
      window.dispatchEvent(new Event("route5:project-updated"));
      pushToast("Project updated.", "success");
    } finally {
      setSavingIdentity(false);
    }
  }

  if (loading || project === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--workspace-surface)] ring-1 ring-[var(--workspace-border)]" />
        <p className="mt-5 text-[14px] font-medium text-[var(--workspace-fg)]">Loading project…</p>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-8 text-center shadow-sm">
        <p className="text-[14px] text-[var(--workspace-muted-fg)]">
          Project not found or you don&apos;t have access.
        </p>
        <Link
          href="/overview"
          className="mt-4 inline-block text-[14px] font-medium text-[var(--workspace-accent)] hover:underline"
        >
          Back to overview
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-8">
      <div className="min-w-0 flex-1 space-y-8">
        <div>
          <Link
            href="/overview"
            className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
          >
            ← Overview
          </Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
                Project
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--workspace-muted-fg)]">Icon</span>
                  <input
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    maxLength={8}
                    placeholder="📁"
                    className="w-[52px] rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-2 text-center text-[18px] leading-none text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
                    aria-label="Project icon or emoji"
                  />
                </label>
                <label className="min-w-0 flex-1 flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--workspace-muted-fg)]">Name</span>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[18px] font-semibold tracking-tight text-[var(--workspace-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
                    aria-label="Project name"
                  />
                </label>
                <button
                  type="button"
                  disabled={savingIdentity}
                  onClick={() => void saveProjectIdentity()}
                  className="mb-0.5 rounded-lg bg-[var(--workspace-accent)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-on-accent)] shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  {savingIdentity ? "Saving…" : "Save"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["📁", "🚀", "💼", "🎯", "📌", "⚡", "🛠️", "📊", "🧭", "✨", "🔥"].map(
                  (ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setEditEmoji(ch)}
                      className="rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-1 text-[15px] transition hover:border-[var(--workspace-accent)]/40"
                      aria-label={`Use ${ch} as icon`}
                    >
                      {ch}
                    </button>
                  )
                )}
              </div>
              <p className="mt-2 max-w-md text-[13px] text-[var(--workspace-muted-fg)]">
                Paste text below → run extraction. Export, scratch, and history on this page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyOpenActions()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/30"
              >
                <ClipboardList className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Actions
              </button>
              <button
                type="button"
                onClick={() => exportProjectJson()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/30"
              >
                <Download className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Export
              </button>
              <button
                type="button"
                onClick={() => setScratchOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/30"
              >
                {scratchOpen ? (
                  <PanelRightClose className="h-3.5 w-3.5 opacity-70" aria-hidden />
                ) : (
                  <PanelRightOpen className="h-3.5 w-3.5 opacity-70" aria-hidden />
                )}
                Scratch
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-[var(--workspace-surface)] px-3 py-2 text-[12px] font-medium text-red-300 shadow-sm transition hover:border-red-500/45 hover:bg-red-950/25"
              >
                <Trash2 className="h-3.5 w-3.5 opacity-90" aria-hidden />
                Delete
              </button>
            </div>
          </div>
        </div>

        <DeleteProjectDialog
          projectId={projectId}
          projectName={project.name}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            pushToast("Project deleted.", "success");
            router.push("/overview");
          }}
        />

        {scratchOpen ? (
          <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-4 shadow-sm backdrop-blur-sm">
            <label className="text-[12px] font-semibold text-[var(--workspace-fg)]" htmlFor="scratch-pad">
              Scratch (local)
            </label>
            <textarea
              id="scratch-pad"
              value={scratch}
              onChange={(e) => persistScratch(e.target.value)}
              rows={4}
              placeholder="Meeting notes, URLs, or snippets before you run an extraction…"
              className="mt-2 w-full resize-y rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!scratch.trim()) return;
                  setPrefill(scratch);
                  pushToast("Sent to composer.", "success");
                }}
                className="text-[12px] font-medium text-[var(--workspace-accent)] hover:underline"
              >
                Send to composer →
              </button>
              <button
                type="button"
                onClick={() => {
                  persistScratch("");
                  pushToast("Cleared.", "info");
                }}
                className="text-[12px] font-medium text-[var(--workspace-muted-fg)] hover:text-[var(--workspace-fg)]"
              >
                Clear
              </button>
            </div>
          </section>
        ) : null}

        <div className="sticky top-[52px] z-20 xl:static xl:z-auto">
          <InputPanel
            projectId={projectId}
            onExtracted={() => {
              void load();
              window.dispatchEvent(new Event("route5:project-updated"));
            }}
            prefillText={prefill}
            onPrefillConsumed={() => setPrefill(null)}
          />
        </div>

        <section id="extractions-section" className="scroll-mt-28 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--workspace-fg)]">
              Extractions
            </h2>
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--workspace-muted-fg)]" aria-hidden />
              <input
                type="search"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                placeholder="Filter by summary, text, decisions…"
                className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] py-2 pl-9 pr-3 text-[13px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/35 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
                aria-label="Filter extractions"
              />
            </div>
          </div>
          {filterQ.trim() ? (
            <p className="flex items-center gap-2 text-[12px] text-[var(--workspace-muted-fg)]">
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Showing {filteredExtractions.length} of {extractions.length}
            </p>
          ) : null}
          {listErr && (
            <p className="text-[13px] text-[var(--workspace-muted-fg)]" role="status">
              {listErr}
            </p>
          )}
          {!listErr && extractions.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-6 py-12 text-center">
              <p className="text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
                No extractions yet. Paste text above and choose{" "}
                <strong className="font-medium text-[var(--workspace-fg)]">Run extraction</strong>.
              </p>
            </div>
          )}
          <div className="space-y-6">
            {filteredExtractions.map((ex) => (
              <ExtractionCard
                key={ex.id}
                projectId={projectId}
                extraction={ex}
                selected={selectedExtractionId === ex.id}
                onSelect={() => setSelectedExtractionId(ex.id)}
                onUpdated={(next) => updateExtraction(ex.id, () => next)}
                onDuplicated={() => void load()}
              />
            ))}
          </div>
        </section>
      </div>

      <WorkspacePreviewPane
        projectName={project.name}
        projectIconEmoji={project.iconEmoji}
        extractions={extractions}
        selectedId={selectedExtractionId}
      />
    </div>
  );
}

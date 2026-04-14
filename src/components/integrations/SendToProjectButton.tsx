"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Inbox, Loader2, PanelRight, Send } from "lucide-react";
import { pushDeskWithDraft } from "@/lib/integration-desk-navigation";
import { writeExtractionDraft } from "@/lib/workspace-bridge";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

type ProjectRow = { id: string; name: string };

type Props = {
  body: string;
  sourceLabel: string;
  /** Appended to Desk URL (e.g. extraction template on Desk). */
  deskPreset?: string;
};

/**
 * Desk-first export: connectors pull live or preview data here, then Route5 runs
 * flow through Desk (same pipeline as Overview metrics and project history).
 */
export default function SendToProjectButton({
  body,
  sourceLabel,
  deskPreset,
}: Props) {
  const router = useRouter();
  const { pushToast } = useWorkspaceExperience();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { projects?: ProjectRow[] };
      setProjects(res.ok ? (data.projects ?? []) : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadProjects();
  }, [open, loadProjects]);

  const trimmed = body.trim();

  function openDesk(projectId?: string) {
    if (!trimmed) {
      pushToast("Import or select content first.", "info");
      return;
    }
    writeExtractionDraft(trimmed, sourceLabel);
    setOpen(false);
    pushDeskWithDraft(router, {
      projectId,
      ...(deskPreset !== undefined ? { preset: deskPreset ?? null } : {}),
    });
    pushToast("Opening Desk…", "success");
  }

  function openClassicProjectPanel(projectId: string) {
    if (!trimmed) {
      pushToast("Import or select content first.", "info");
      return;
    }
    writeExtractionDraft(trimmed, sourceLabel);
    setOpen(false);
    router.push(`/projects/${projectId}?draft=1`);
    pushToast("Opening project capture…", "success");
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={() => openDesk()}
        disabled={!trimmed}
        title={!trimmed ? "Fetch or copy issue text first" : "Open Route5 Desk with this content"}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--workspace-fg)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-sm transition hover:opacity-95 disabled:opacity-40"
      >
        <Inbox className="h-4 w-4" aria-hidden />
        Open in Desk
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={!trimmed}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-40 sm:w-auto"
        >
          <Send className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
          Project on Desk
          <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
        </button>
        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-black/20"
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,320px)] rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-3 shadow-xl">
              <p className="px-1 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
                Choose a project — Desk stays selected so runs and Overview stay aligned.
              </p>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--workspace-muted-fg)]" aria-hidden />
                </div>
              ) : projects.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[var(--workspace-muted-fg)]">
                  No projects yet. Create one from Overview, then send here.
                </p>
              ) : (
                <ul className="mt-2 max-h-56 overflow-y-auto">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openDesk(p.id)}
                        className="flex w-full rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]"
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-[var(--workspace-border)] pt-4">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                  Legacy capture
                </p>
                <p className="mt-1 px-1 text-[11px] text-[var(--workspace-muted-fg)]">
                  Opens the in-project input panel instead of Desk.
                </p>
                {projects.length > 0 ? (
                  <ul className="mt-2 max-h-56 overflow-y-auto">
                    {projects.map((p) => (
                      <li key={`classic-${p.id}`}>
                        <button
                          type="button"
                          onClick={() => openClassicProjectPanel(p.id)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)] hover:text-[var(--workspace-fg)]"
                        >
                          <PanelRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

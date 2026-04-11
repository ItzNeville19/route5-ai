"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { writeExtractionDraft } from "@/lib/workspace-bridge";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

type ProjectRow = { id: string; name: string };

type Props = {
  body: string;
  sourceLabel: string;
};

export default function SendToProjectButton({ body, sourceLabel }: Props) {
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

  function sendTo(projectId: string) {
    if (!body.trim()) {
      pushToast("Copy an issue first.", "info");
      return;
    }
    writeExtractionDraft(body, sourceLabel);
    setOpen(false);
    router.push(`/projects/${projectId}?draft=1`);
    pushToast("Opening…", "success");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
      >
        <Send className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
        Send to project
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
            <p className="px-1 text-[11px] text-[var(--workspace-muted-fg)]">Choose project.</p>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--workspace-muted-fg)]" aria-hidden />
              </div>
            ) : projects.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-[var(--workspace-muted-fg)]">
                No projects yet. Create one from the dashboard.
              </p>
            ) : (
              <ul className="mt-2 max-h-56 overflow-y-auto">
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => sendTo(p.id)}
                      className="flex w-full rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

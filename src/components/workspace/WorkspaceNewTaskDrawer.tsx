"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceChromeActions } from "@/components/workspace/WorkspaceChromeActions";

type Priority = "low" | "medium" | "high" | "critical";

type OrgPayload = {
  members?: Array<{ userId: string; displayName: string; role: string }>;
};

type ProjectsPayload = {
  projects?: Array<{ id: string; name: string }>;
};

function defaultDeadlineLocalValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  d.setHours(17, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Create a commitment and assign an owner from the workspace roster. */
export default function WorkspaceNewTaskDrawer() {
  const { newTaskOpen, closeNewTask } = useWorkspaceChromeActions();
  const { pushToast } = useWorkspaceExperience();
  const { orgRole } = useWorkspaceData();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<OrgPayload["members"]>([]);
  const [projects, setProjects] = useState<ProjectsPayload["projects"]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadlineLocalValue);
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!newTaskOpen) return;
    if (orgRole !== "admin" && orgRole !== "manager") return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [orgRes, projectRes] = await Promise.all([
          fetch("/api/workspace/organization", { credentials: "same-origin" }),
          fetch("/api/projects", { credentials: "same-origin" }),
        ]);
        const data = (await orgRes.json().catch(() => ({}))) as OrgPayload;
        const projectsData = (await projectRes.json().catch(() => ({}))) as ProjectsPayload;
        if (cancelled || !orgRes.ok) return;
        const raw = data.members ?? [];
        let list = raw.filter((m) => m.role !== "admin");
        if (list.length === 0 && raw.length > 0) list = raw;
        setMembers(list);
        setProjects(projectsData.projects ?? []);
        if (list[0]?.userId) setOwnerId(list[0].userId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [newTaskOpen, orgRole]);

  const canSubmit = useMemo(
    () => Boolean(ownerId && title.trim() && deadline && description.trim()),
    [ownerId, title, deadline, description]
  );

  const reset = useCallback(() => {
    setNotice(null);
    setTitle("");
    setDescription("");
    setProjectId("");
    setDeadline(defaultDeadlineLocalValue);
    setPriority("medium");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setNotice(null);
    try {
      const deadlineIso = new Date(deadline).toISOString();
      const res = await fetch("/api/commitments/batch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              title: title.trim(),
              description: description.trim(),
              ownerId,
              deadline: deadlineIso,
              priority,
              projectId: projectId || null,
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setNotice(data.message ?? data.error ?? "Could not create task.");
        return;
      }
      pushToast("Task created — assignee receives notification when applicable.", "success");
      reset();
      closeNewTask();
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !newTaskOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close new task panel"
        onClick={() => closeNewTask()}
      />
      <aside
        className="relative flex h-full w-full max-w-[min(100vw-16px,440px)] flex-col border-l border-cyan-500/18 bg-[linear-gradient(165deg,rgba(8,28,38,0.98),rgba(5,10,14,0.99))] shadow-[0_0_80px_-20px_rgba(34,211,238,0.35)]"
        role="dialog"
        aria-labelledby="workspace-new-task-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/45">Command center</p>
            <h2 id="workspace-new-task-title" className="mt-1 text-lg font-semibold text-white">
              New task
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-white/45">
              Assign org work with a deadline — saved to commitments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => closeNewTask()}
            className="route5-pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-black/35 text-white/70 hover:border-cyan-400/35 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-[13px] text-white/55">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400/85" />
              Loading teammates…
            </div>
          ) : (
            <form id="workspace-new-task-form" onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to happen"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-[14px] text-white placeholder:text-white/28 outline-none focus:border-cyan-400/38"
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Assignee</span>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-[14px] text-white outline-none focus:border-cyan-400/38"
                >
                  {(members ?? []).map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Due</span>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-[14px] text-white outline-none focus:border-cyan-400/38"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-[14px] text-white outline-none focus:border-cyan-400/38"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Urgent</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Project (optional)</span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-[14px] text-white outline-none focus:border-cyan-400/38"
                >
                  <option value="">No project</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Context, acceptance criteria, links…"
                  rows={5}
                  className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-[14px] text-white placeholder:text-white/28 outline-none focus:border-cyan-400/38"
                />
              </label>

              {notice ? <p className="text-[12px] text-amber-200/95">{notice}</p> : null}
            </form>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/[0.06] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              form="workspace-new-task-form"
              disabled={!canSubmit || saving || loading}
              className="route5-pressable inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-950/45 px-4 text-[14px] font-semibold text-emerald-50 shadow-[0_12px_40px_-18px_rgba(16,185,129,0.35)] disabled:opacity-45"
            >
              {saving ? "Saving…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => closeNewTask()}
              className="route5-pressable inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-black/35 px-4 text-[14px] font-medium text-white/75 hover:border-white/20"
            >
              Cancel
            </button>
          </div>
        </footer>
      </aside>
    </div>,
    document.body
  );
}

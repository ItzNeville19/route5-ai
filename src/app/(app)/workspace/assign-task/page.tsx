"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Send } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

type OrgRole = "admin" | "manager" | "member";

type OrgPayload = {
  members?: Array<{
    userId: string;
    displayName: string;
    role: OrgRole;
  }>;
};

type ProjectsPayload = {
  projects?: Array<{
    id: string;
    name: string;
  }>;
};

type Priority = "low" | "medium" | "high" | "critical";

export default function AssignTaskPage() {
  const router = useRouter();
  const { orgRole, loadingOrganization } = useWorkspaceData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<OrgPayload["members"]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [context, setContext] = useState("");
  const [directions, setDirections] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [projects, setProjects] = useState<ProjectsPayload["projects"]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (loadingOrganization) return;
    if (orgRole !== "admin") {
      router.replace("/workspace/my-inbox");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [orgRes, projectRes] = await Promise.all([
          fetch("/api/workspace/organization", { credentials: "same-origin" }),
          fetch("/api/projects", { credentials: "same-origin" }),
        ]);
        const data = (await orgRes.json().catch(() => ({}))) as OrgPayload;
        const projectsData = (await projectRes.json().catch(() => ({}))) as ProjectsPayload;
        if (cancelled || !orgRes.ok) return;
        const list = (data.members ?? []).filter((m) => m.role !== "admin");
        setMembers(list);
        if (list[0]?.userId) setOwnerId(list[0].userId);
        setProjects(projectsData.projects ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadingOrganization, orgRole, router]);

  const canSend = useMemo(
    () =>
      Boolean(
        ownerId &&
          title.trim() &&
          deadline &&
          context.trim() &&
          directions.trim() &&
          successCriteria.trim()
      ),
    [ownerId, title, deadline, context, directions, successCriteria]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          title: title.trim(),
          description: [
            `Context:\n${context.trim()}`,
            `Directions:\n${directions.trim()}`,
            `Success criteria:\n${successCriteria.trim()}`,
            estimatedHours.trim() ? `Estimated effort:\n${estimatedHours.trim()} hour(s)` : null,
          ]
            .filter(Boolean)
            .join("\n\n"),
          deadline: new Date(deadline).toISOString(),
          priority,
          projectId: projectId || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not send task.");
        return;
      }
      setTitle("");
      setProjectId("");
      setDeadline("");
      setPriority("medium");
      setContext("");
      setDirections("");
      setSuccessCriteria("");
      setEstimatedHours("");
      setNotice("Task sent. The assignee receives an in-app notification and email.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-4 pb-16">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          ADMIN WORKSPACE
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-slate-100">Assign Task</h1>
        <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">
          Send a full execution brief to a teammate: context, directions, success criteria, priority, project, and due time.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Use Assign Task for direct delegation</p>
            <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">You already know the work. Send it with complete instructions.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Use Capture for extraction</p>
            <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">Paste notes/emails and auto-convert decisions into assignable tasks.</p>
            <Link href="/capture" className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:underline dark:text-indigo-300">
              Open Capture <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Member</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
              >
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Task</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Type the task"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Company / Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                >
                  <option value="">No project</option>
                  {(projects ?? []).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Estimated effort (hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 3"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Deadline</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Context</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Why this matters, business context, blockers to consider..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Directions</label>
              <textarea
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                placeholder="Step-by-step direction, dependencies, links, who to contact..."
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Success criteria</label>
              <textarea
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
                placeholder="What does done look like? Include measurable acceptance criteria."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={!canSend || saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              <Send className="h-4 w-4" />
              {saving ? "Sending…" : "Send"}
            </button>
            {notice ? <p className="text-[12px] text-slate-600 dark:text-slate-300">{notice}</p> : null}
          </form>
        )}
      </section>
    </div>
  );
}

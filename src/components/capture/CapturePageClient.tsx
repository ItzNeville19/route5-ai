"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2, Loader2, ListChecks, Sparkles } from "lucide-react";
import { useCapture } from "@/components/capture/CaptureProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import type { CommitmentSource } from "@/lib/commitment-types";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";

type Priority = OrgCommitmentPriority;

type ExtractedCard = {
  key: string;
  title: string;
  ownerId: string;
  deadlineIso: string;
  priority: Priority;
  source: CommitmentSource;
  snippet: string;
  projectId: string | null;
};

type MemberOption = {
  userId: string;
  displayName: string;
  role: "admin" | "manager" | "member";
};

type ProjectOption = {
  id: string;
  name: string;
};

function defaultDeadlineIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

function sourceLabel(source: CommitmentSource): string {
  if (source === "email") return "Email";
  if (source === "meeting") return "Meeting";
  if (source === "slack") return "Slack";
  return "Manual";
}

export default function CapturePageClient() {
  const { open } = useCapture();
  const { user } = useUser();
  const { orgRole, loadingOrganization } = useWorkspaceData();
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cards, setCards] = useState<ExtractedCard[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [phase, setPhase] = useState<"intake" | "review" | "done">("intake");

  const isAdminView = !loadingOrganization && orgRole !== "member";
  const defaultOwnerId = user?.id ?? "";

  useEffect(() => {
    if (loadingOrganization) return;
    let cancelled = false;
    (async () => {
      try {
        const [orgRes, projectsRes] = await Promise.all([
          fetch("/api/workspace/organization", { credentials: "same-origin" }),
          fetch("/api/projects", { credentials: "same-origin" }),
        ]);
        const orgData = (await orgRes.json().catch(() => ({}))) as { members?: MemberOption[] };
        const projectsData = (await projectsRes.json().catch(() => ({}))) as { projects?: ProjectOption[] };
        if (cancelled) return;
        const orgMembers = (orgData.members ?? []).filter((m) => Boolean(m.userId && m.displayName));
        setMembers(orgMembers);
        setProjects((projectsData.projects ?? []).map((p) => ({ id: p.id, name: p.name })));
      } catch {
        if (!cancelled) {
          setMembers([]);
          setProjects([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadingOrganization]);

  const quickTemplates = useMemo(
    () => [
      {
        label: "Weekly team sync",
        text: `Weekly sync actions:
- Alex will ship billing QA fix by Friday.
- Priya will update onboarding docs by Thursday noon.
- Jordan will schedule customer follow-up for Monday.`,
      },
      {
        label: "Client call",
        text: `Client escalation notes:
- Account manager to send recovery plan by tomorrow 5pm.
- Engineering owner to patch API timeout this week.
- CS lead to schedule status call for Friday.`,
      },
      {
        label: "Product launch",
        text: `Launch commitments:
- Product to finalize release notes by Wednesday.
- Marketing to publish launch page by Thursday.
- Support to prep FAQ and macros by Friday.`,
      },
    ],
    []
  );

  const canProcess = text.trim().length > 0 && !processing;
  const canCommit = cards.length > 0 && !committing;

  async function processText() {
    if (!canProcess) return;
    setProcessing(true);
    setNotice(null);
    try {
      const res = await fetch("/api/capture/process", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        commitments?: Array<{
          title: string;
          source: CommitmentSource;
          sourceSnippet: string;
          dueDateIso: string | null;
          priority: Priority;
          ownerUserId?: string | null;
        }>;
        error?: string;
      };
      if (!res.ok) {
        setNotice(data.error ?? "Could not process capture text.");
        return;
      }
      const extracted = (data.commitments ?? []).map((item, idx) => ({
        key: `${idx}-${item.title}`.replace(/\s+/g, "-"),
        title: item.title,
        ownerId: item.ownerUserId?.trim() || defaultOwnerId,
        deadlineIso: item.dueDateIso ?? defaultDeadlineIso(),
        priority: item.priority ?? "medium",
        source: item.source ?? "manual",
        snippet: item.sourceSnippet ?? item.title,
        projectId: null,
      }));
      if (extracted.length === 0) {
        setNotice("No commitments detected. Try clearer action-item language.");
        return;
      }
      setCards(extracted);
      setPhase("review");
      setNotice(`Detected ${extracted.length} commitments. Review and commit.`);
    } catch {
      setNotice("Network issue while processing capture text.");
    } finally {
      setProcessing(false);
    }
  }

  async function commitAll() {
    if (!canCommit || !defaultOwnerId) return;
    setCommitting(true);
    setNotice(null);
    try {
      const payload = cards.map((card) => ({
        title: card.title.trim(),
        description: `— Source (${card.source}) —\n${card.snippet}`,
        ownerId: card.ownerId || defaultOwnerId,
        deadline: card.deadlineIso,
        priority: card.priority,
        projectId: card.projectId,
      }));
      const res = await fetch("/api/commitments/batch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { count?: number; error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not save commitments.");
        return;
      }
      const count = data.count ?? payload.length;
      setSavedCount(count);
      setPhase("done");
      setCards([]);
      setText("");
      setNotice(`${count} commitments saved and synced.`);
      window.dispatchEvent(new Event("route5:commitments-changed"));
    } catch {
      setNotice("Network issue while committing tasks.");
    } finally {
      setCommitting(false);
    }
  }

  function updateCard(key: string, patch: Partial<ExtractedCard>) {
    setCards((prev) => prev.map((card) => (card.key === key ? { ...card, ...patch } : card)));
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-16">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              {isAdminView ? "ADMIN WORKSPACE" : "MY WORKSPACE"}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
              Capture Command Center
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] text-slate-600 dark:text-slate-300">
              Ingest notes, extract commitments, review ownership and deadlines, then push to Desk in one connected flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => open()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Sparkles className="h-4 w-4" />
              Open Side Capture
            </button>
            <Link
              href={isAdminView ? "/workspace/assign-task" : "/workspace/my-inbox"}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {isAdminView ? "Assign task manually" : "My inbox"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">1) Paste your context</h2>
            <span className="text-[12px] text-slate-500 dark:text-slate-400">{text.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste meeting notes, Slack thread, or email chain..."
            className="mt-3 min-h-[280px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {quickTemplates.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => setText(template.text)}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {template.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!canProcess}
            onClick={() => void processText()}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
            {processing ? "Processing..." : "Process into tasks"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">2) Role workflow</h2>
            <ul className="mt-2 space-y-2 text-[13px] text-slate-600 dark:text-slate-300">
              <li>Admin: Capture → review ownership → commit → monitor in Desk/Org Feed.</li>
              <li>Member: Capture → assign to yourself/team → execute from My Inbox.</li>
              <li>Projects + deadlines stay connected to tracker and dashboard reporting.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">Quick links</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link className="rounded-xl border border-slate-300 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href="/desk">Desk</Link>
              <Link className="rounded-xl border border-slate-300 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href="/workspace/commitments">Task tracker</Link>
              <Link className="rounded-xl border border-slate-300 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href="/projects">Projects</Link>
              <Link className="rounded-xl border border-slate-300 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href="/workspace/org-feed">Org feed</Link>
            </div>
          </div>
        </div>
      </section>

      {notice ? (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-200">
          {notice}
        </section>
      ) : null}

      {phase === "review" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">3) Review and commit</h2>
            <button
              type="button"
              disabled={!canCommit}
              onClick={() => void commitAll()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {committing ? "Saving..." : `Commit ${cards.length} tasks`}
            </button>
          </div>
          <div className="space-y-3">
            {cards.map((card) => (
              <article key={card.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <input
                  value={card.title}
                  onChange={(e) => updateCard(card.key, { title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[14px] font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                />
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <select
                    value={card.ownerId}
                    onChange={(e) => updateCard(card.key, { ownerId: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-[12px] text-slate-800 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                  >
                    {(members.length ? members : [{ userId: defaultOwnerId, displayName: "You", role: "member" }]).map((m) => (
                      <option key={m.userId} value={m.userId}>{m.displayName}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={card.deadlineIso ? new Date(card.deadlineIso).toISOString().slice(0, 16) : ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        updateCard(card.key, { deadlineIso: defaultDeadlineIso() });
                        return;
                      }
                      const next = new Date(e.target.value);
                      if (!Number.isFinite(next.getTime())) return;
                      updateCard(card.key, { deadlineIso: next.toISOString() });
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-[12px] text-slate-800 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                  />
                  <select
                    value={card.priority}
                    onChange={(e) => updateCard(card.key, { priority: e.target.value as Priority })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-[12px] text-slate-800 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                  >
                    <option value="critical">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Normal</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={card.projectId ?? ""}
                    onChange={(e) => updateCard(card.key, { projectId: e.target.value || null })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-[12px] text-slate-800 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Source: {sourceLabel(card.source)} · {card.snippet}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {phase === "done" ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-200">
          <p className="text-[14px] font-semibold">Committed {savedCount} tasks successfully.</p>
          <p className="mt-1 text-[12px]">They are now visible in Desk, Task tracker, and role-specific queues.</p>
        </section>
      ) : null}
    </div>
  );
}

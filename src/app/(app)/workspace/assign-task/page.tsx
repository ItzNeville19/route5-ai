"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

type OrgRole = "admin" | "manager" | "member";

type OrgPayload = {
  members?: Array<{
    userId: string;
    displayName: string;
    role: OrgRole;
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
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
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
        const res = await fetch("/api/workspace/organization", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as OrgPayload;
        if (cancelled || !res.ok) return;
        const list = (data.members ?? []).filter((m) => m.role !== "admin");
        setMembers(list);
        if (list[0]?.userId) setOwnerId(list[0].userId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadingOrganization, orgRole, router]);

  const canSend = useMemo(
    () => Boolean(ownerId && title.trim() && deadline),
    [ownerId, title, deadline]
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
          description: null,
          deadline: new Date(deadline).toISOString(),
          priority,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not send task.");
        return;
      }
      setTitle("");
      setDeadline("");
      setPriority("medium");
      setNotice("Task sent.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-16">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-r5-text-secondary">
          ADMIN WORKSPACE
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-r5-text-primary">Assign Task</h1>
        <p className="mt-1 text-[13px] text-r5-text-secondary">
          Create a commitment and send it directly to a member.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-r5-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">Member</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-primary px-3 text-[14px] text-r5-text-primary"
              >
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">Task</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Type the task"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-primary px-3 text-[14px] text-r5-text-primary"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">Deadline</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-primary px-3 text-[14px] text-r5-text-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-primary px-3 text-[14px] text-r5-text-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Urgent</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={!canSend || saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-r5-text-primary px-4 text-[14px] font-semibold text-r5-surface-primary disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {saving ? "Sending…" : "Send"}
            </button>
            {notice ? <p className="text-[12px] text-r5-text-secondary">{notice}</p> : null}
          </form>
        )}
      </section>
    </div>
  );
}

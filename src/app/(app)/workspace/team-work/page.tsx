"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";

type OrgPayload = {
  me: { userId: string; role: "admin" | "manager" | "member" };
  members: Array<{
    userId: string;
    displayName: string;
  }>;
};

export default function TeamWorkPage() {
  const [rows, setRows] = useState<OrgCommitmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameById, setNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tasksRes, orgRes] = await Promise.all([
          fetch("/api/workspace/team-work?openOnly=1", { credentials: "same-origin" }),
          fetch("/api/workspace/organization", { credentials: "same-origin" }),
        ]);
        const tasksData = (await tasksRes.json().catch(() => ({}))) as {
          commitments?: OrgCommitmentRow[];
        };
        const orgData = (await orgRes.json().catch(() => ({}))) as OrgPayload;
        if (!cancelled && tasksRes.ok) {
          setRows(tasksData.commitments ?? []);
        }
        if (!cancelled && orgRes.ok) {
          const map: Record<string, string> = {};
          for (const member of orgData.members ?? []) {
            map[member.userId] = member.displayName;
          }
          setNameById(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, OrgCommitmentRow[]>();
    for (const row of rows) {
      const owner = row.ownerId?.trim() || "unassigned";
      const current = map.get(owner) ?? [];
      current.push(row);
      map.set(owner, current);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,1200px)] space-y-4 px-1">
      <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-r5-text-secondary">Team workspace</p>
            <h1 className="mt-1 text-[20px] font-semibold text-r5-text-primary">All employees and all of their work</h1>
          </div>
          <Link href="/overview" className="text-[12px] font-medium text-r5-accent hover:underline">
            Back to home
          </Link>
        </div>
      </section>

      {loading ? (
        <p className="text-[13px] text-r5-text-secondary">Loading team work…</p>
      ) : grouped.length === 0 ? (
        <p className="text-[13px] text-r5-text-secondary">No open tasks found.</p>
      ) : (
        <section className="space-y-3">
          {grouped.map(([ownerId, tasks]) => (
            <article key={ownerId} className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-r5-text-primary">{nameById[ownerId] ?? ownerId}</h2>
                <span className="text-[11px] text-r5-text-secondary">{tasks.length} open tasks</span>
              </div>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/50 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] text-r5-text-primary">{task.title}</p>
                      <span className="text-[11px] text-r5-text-secondary">{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AuditTrailEntry } from "@/lib/workspace/audit-and-trends";
import { NativeDateInput } from "@/components/ui/native-datetime-fields";
import { deskUrl } from "@/lib/desk-routes";

export default function WorkspaceAuditPage() {
  const [entries, setEntries] = useState<AuditTrailEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeArchived, setIncludeArchived] = useState(true);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (from.trim()) u.set("from", new Date(from).toISOString());
    if (to.trim()) u.set("to", new Date(to).toISOString());
    if (owner.trim()) u.set("owner", owner.trim());
    if (includeArchived) u.set("includeArchived", "1");
    return u.toString();
  }, [from, to, owner, includeArchived]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/audit-log?${qs}`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { entries?: AuditTrailEntry[] };
      if (!res.ok) {
        setEntries([]);
        return;
      }
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[min(100%,1120px)] pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Accountability
      </p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
        Audit trail
      </h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Every note, status change, and owner update from your commitments — read from the database. Archived
        commitments stay visible here when included.
      </p>

      <div className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-4">
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-1.5 text-[13px] text-[var(--workspace-fg)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
          To
          <NativeDateInput
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-1.5 text-[13px] text-[var(--workspace-fg)]"
          />
        </label>
        <label className="min-w-[160px] flex flex-col gap-1 text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
          Owner contains
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Clerk id or name"
            className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-1.5 text-[13px] text-[var(--workspace-fg)]"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Include archived
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--workspace-accent)]" />
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {(entries ?? []).map((e) => (
            <li
              key={`${e.commitmentId}-${e.at}-${e.body.slice(0, 24)}`}
              className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 px-4 py-3 text-[13px]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-[var(--workspace-fg)]">{e.commitmentTitle}</span>
                <span className="text-[11px] text-[var(--workspace-muted-fg)]">{e.at}</span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
                {e.projectName} · {e.kind}
                {e.archived ? " · archived" : ""} · current: {e.currentStatus}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-fg)]/95">{e.body}</p>
              <Link
                href={deskUrl({ projectId: e.projectId })}
                className="mt-2 inline-block text-[12px] font-medium text-[var(--workspace-accent)] hover:underline"
              >
                Open Desk
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && (entries?.length ?? 0) === 0 ? (
        <p className="mt-8 text-[14px] text-[var(--workspace-muted-fg)]">No audit entries for these filters.</p>
      ) : null}
    </div>
  );
}

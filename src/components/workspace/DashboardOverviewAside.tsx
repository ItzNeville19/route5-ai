"use client";

import Link from "next/link";
import type { RecentExtractionRow } from "@/lib/workspace-summary";
import { deskUrl } from "@/lib/desk-routes";
import { formatRelativeShort } from "@/lib/relative-time";

type Props = {
  recent: RecentExtractionRow[];
  loading: boolean;
  /** Dark “command center” panel on Overview hero. */
  variant?: "default" | "command";
};

const MAX = 5;

export default function DashboardOverviewAside({
  recent,
  loading,
  variant = "default",
}: Props) {
  const rows = recent.slice(0, MAX);
  const cmd = variant === "command";

  const shell = cmd
    ? "rounded-2xl border border-white/10 bg-black/30 p-3.5 shadow-sm backdrop-blur-sm"
    : "rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-mission-bg)] p-3.5 shadow-sm";

  const label = cmd ? "text-zinc-300" : "text-[var(--workspace-muted-fg)]";
  const sub = cmd ? "text-zinc-300" : "text-[var(--workspace-muted-fg)]";
  const body = cmd ? "text-zinc-400" : "text-[var(--workspace-muted-fg)]";
  const link = cmd ? "text-violet-300 hover:text-violet-200" : "text-[var(--workspace-accent)] hover:underline";
  const rowText = cmd ? "text-zinc-100" : "text-[var(--workspace-fg)]";
  const time = cmd ? "text-zinc-300" : "text-[var(--workspace-muted-fg)]";
  const divide = cmd ? "divide-white/10" : "divide-[var(--workspace-border)]";
  const hover = cmd ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]";

  return (
    <aside className="w-full min-w-0 max-w-md space-y-0 lg:max-w-[300px]">
      <div className={shell}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${label}`}>
          Recent passes
        </p>
        <p className={`mt-0.5 text-[11px] leading-snug ${sub}`}>
          Live from saved runs — newest first.
        </p>

        {loading ? (
          <div className="mt-3 space-y-2" aria-hidden>
            <div
              className={`h-11 rounded-xl ${cmd ? "bg-white/10" : "bg-black/[0.05] dark:bg-white/[0.06]"}`}
            />
            <div
              className={`h-11 rounded-xl ${cmd ? "bg-white/10" : "bg-black/[0.05] dark:bg-white/[0.06]"}`}
            />
          </div>
        ) : rows.length === 0 ? (
          <p className={`mt-3 text-[13px] leading-relaxed ${body}`}>
            No runs yet.{" "}
            <Link href={deskUrl()} className={`font-semibold ${link}`}>
              Paste a thread on Desk
            </Link>
          </p>
        ) : (
          <ul className={`mt-3 divide-y ${divide}`}>
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/projects/${r.projectId}#extractions-section`}
                  className={`group flex items-start justify-between gap-3 rounded-lg py-2.5 text-left transition ${hover}`}
                >
                  <span className={`min-w-0 truncate text-[13px] font-medium ${rowText}`}>
                    {r.projectName}
                  </span>
                  <span className={`shrink-0 text-[11px] tabular-nums ${time}`}>
                    {formatRelativeShort(r.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && rows.length > 0 ? (
          <Link href="/projects" className={`mt-2 inline-flex text-[12px] font-semibold ${link}`}>
            All projects
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

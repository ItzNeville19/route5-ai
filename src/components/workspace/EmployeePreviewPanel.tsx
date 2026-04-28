"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ChevronRight, Eye } from "lucide-react";

type ActivityRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  completed_at: string | null;
};

/** Standalone employee-preview surface — same data path as dashboard employee mode (`scope=self`). */
export default function EmployeePreviewPanel() {
  const { user } = useUser();
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName =
    user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "there";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/dashboard/activity?scope=self", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { activity?: ActivityRow[] };
      if (!cancelled && res.ok) setActivity(data.activity ?? []);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 animate-[route5-page-enter_0.35s_ease-out_both]">
      <header className="rounded-[26px] border border-emerald-500/15 bg-[linear-gradient(145deg,rgba(16,38,26,0.55),rgba(10,12,11,0.96))] p-6 shadow-[0_28px_90px_-52px_rgba(16,185,129,0.35)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/95">
          <Eye className="h-3.5 w-3.5" />
          Employee preview
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          What {firstName} sees in Route5
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
          Production-scoped commitments assigned to this account: titles, activity timestamps, and completion state —
          exactly what lands in their workspace surface before any recovery message sends.
        </p>
      </header>

      <section className="rounded-[22px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white">Assigned commitments</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {activity.length === 0 ? (
            <li className="py-10 text-center text-sm text-white/45">No commitments assigned yet.</li>
          ) : (
            activity.slice(0, 24).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-white">{row.title}</p>
                  <p className="mt-1 text-xs text-white/45">
                    Updated {new Date(row.updated_at).toLocaleString()} · Status: {row.status.replace(/_/g, " ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-200/95">
                  {row.completed_at ? "Completed" : "Active"}
                </span>
              </li>
            ))
          )}
        </ul>
        <Link
          href="/workspace/commitments"
          className="route5-pressable mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Open commitments <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

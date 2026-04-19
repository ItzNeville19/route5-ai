"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

type Availability = "live" | "import" | "waitlist";

export type IntegrationsDirectoryCard = {
  href: string;
  name: string;
  desc: string;
  badge: string;
  readinessKey?: "openai" | "linear" | "github" | "figma";
  availability: Availability;
};

function statusLabel(
  card: IntegrationsDirectoryCard,
  readiness: ReturnType<typeof useWorkspaceData>["summary"]["readiness"]
): Availability {
  if (card.readinessKey) {
    return readiness?.[card.readinessKey] ? "live" : "import";
  }
  return card.availability;
}

function statusRank(status: Availability): number {
  if (status === "live") return 0;
  if (status === "import") return 1;
  return 2;
}

function statusPill(status: Availability): { label: string; className: string } {
  if (status === "live") {
    return {
      label: "Live",
      className: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
    };
  }
  if (status === "import") {
    return {
      label: "Import-only",
      className: "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 text-[var(--workspace-muted-fg)]",
    };
  }
  return {
    label: "Waitlist",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  };
}

export default function IntegrationsDirectoryGrid({
  cards,
}: {
  cards: IntegrationsDirectoryCard[];
}) {
  const { summary } = useWorkspaceData();

  const normalized = useMemo(() => {
    const rows = cards
      .map((card) => {
        const status = statusLabel(card, summary.readiness);
        return { ...card, status };
      })
      .sort((a, b) => {
        const sr = statusRank(a.status) - statusRank(b.status);
        if (sr !== 0) return sr;
        return a.name.localeCompare(b.name);
      });

    const totals = rows.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        return acc;
      },
      { live: 0, import: 0, waitlist: 0 } as Record<Availability, number>
    );
    return { rows, totals };
  }, [cards, summary.readiness]);

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 text-[12px] text-emerald-200">
          {normalized.totals.live} live
        </span>
        <span className="rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 px-3 py-1 text-[12px] text-[var(--workspace-muted-fg)]">
          {normalized.totals.import} import-only
        </span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[12px] text-amber-100">
          {normalized.totals.waitlist} waitlist
        </span>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {normalized.rows.map((c) => {
          const pill = statusPill(c.status);
          return (
            <li key={c.href}>
              <Link
                href={c.href}
                className="dashboard-home-card group flex h-full flex-col rounded-[24px] p-6 transition hover:border-[var(--workspace-accent)]/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-accent)]">
                    {c.badge}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${pill.className}`}>
                    {pill.label}
                  </span>
                </div>
                <span className="mt-2 text-[18px] font-semibold text-[var(--workspace-fg)]">{c.name}</span>
                <span className="mt-2 flex-1 text-[13px] text-[var(--workspace-muted-fg)]">{c.desc}</span>
                <span className="mt-4 text-[13px] font-medium text-[var(--workspace-accent)] group-hover:underline">
                  Open
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

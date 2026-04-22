"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { WorkspaceConnectorReadiness } from "@/lib/workspace-summary";

type Props = {
  readiness: WorkspaceConnectorReadiness | null;
};

/** Compact iOS-style grouped list — not a second hero. */
export default function IntegrationConnectionsStrip({ readiness }: Props) {
  const rows = [
    {
      href: "/settings",
      title: "OpenAI",
      subtitle: readiness?.openai ? "Configured for decision capture" : "Add an API key to enable AI capture",
      badge: readiness?.openai ? "On" : "Set up",
      badgeTone: readiness?.openai ? ("on" as const) : ("warn" as const),
    },
    {
      href: "/integrations/linear",
      title: "Linear",
      subtitle: "Issues, samples, import into projects",
      badge: null,
      badgeTone: null,
    },
    {
      href: "/integrations/github",
      title: "GitHub",
      subtitle: "Issues, samples, import by URL",
      badge: null,
      badgeTone: null,
    },
    {
      href: "/integrations/figma",
      title: "Figma",
      subtitle: readiness?.figma ? "File + comments import from links" : "Set FIGMA_ACCESS_TOKEN for API import",
      badge: readiness?.figma ? "On" : null,
      badgeTone: readiness?.figma ? ("on" as const) : null,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/85 shadow-sm">
      <div className="border-b border-[var(--workspace-border)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
          Connections
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-[var(--workspace-muted-fg)]">
          Configure tools in one place. Same links as Settings → Integrations.
        </p>
      </div>
      <ul className="divide-y divide-[var(--workspace-border)]">
        {rows.map((row) => (
          <li key={row.href}>
            <Link
              href={row.href}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--workspace-nav-hover)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-[var(--workspace-fg)]">{row.title}</span>
                  {row.badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        row.badgeTone === "on"
                          ? "bg-emerald-500/15 text-[var(--workspace-fg)]"
                          : "bg-amber-500/12 text-[var(--workspace-fg)]"
                      }`}
                    >
                      {row.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--workspace-muted-fg)]">{row.subtitle}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--workspace-muted-fg)]/50" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

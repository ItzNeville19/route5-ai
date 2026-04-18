"use client";

import Link from "next/link";
import { ArrowUpRight, BarChart3 } from "lucide-react";

const CONNECTORS: { href: string; label: string; note: string }[] = [
  { href: "/integrations/linear", label: "Linear", note: "Browse or import when API keys are set" },
  { href: "/integrations/github", label: "GitHub", note: "Samples or live issues with token" },
  { href: "/integrations/figma", label: "Figma", note: "Design links into Desk" },
  { href: "/integrations/slack", label: "Slack", note: "Paste or deployment webhook" },
  { href: "/integrations/google", label: "Google", note: "Context and paste flows" },
];

/**
 * Optional connectors — not in primary nav; keeps the workspace focused on execution.
 */
export default function SettingsConnectionsSection() {
  return (
    <section id="connections" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Connections
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Bring context in from other tools when you need it. Live lists and imports require the right
          credentials on your deployment — each screen explains what works today.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {CONNECTORS.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 py-3 text-left transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-canvas)]/40"
            >
              <span>
                <span className="block text-[14px] font-semibold text-[var(--workspace-fg)]">{c.label}</span>
                <span className="mt-0.5 block text-[12px] text-[var(--workspace-muted-fg)]">{c.note}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--workspace-muted-fg)]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/35 px-4 py-3">
        <Link
          href="/overview"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--workspace-accent)] hover:underline"
        >
          <BarChart3 className="h-4 w-4" aria-hidden />
          Full analytics and JSON export
        </Link>
        <p className="mt-1.5 text-[12px] text-[var(--workspace-muted-fg)]">
          Deeper charts and workspace export — same data as Overview; Pro may unlock full export.
        </p>
      </div>
    </section>
  );
}

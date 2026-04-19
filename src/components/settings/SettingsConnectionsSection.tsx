"use client";

import Link from "next/link";
import { ArrowUpRight, BarChart3, Calendar } from "lucide-react";

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

      <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 px-4 py-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--workspace-canvas)]/80 text-[var(--workspace-fg)] ring-1 ring-white/5">
            <Calendar className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-[var(--workspace-fg)]">Google Calendar &amp; Apple Calendar</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
              Connect Google once: Route5 syncs commitment due dates to your{" "}
              <strong className="font-semibold text-[var(--workspace-fg)]">Google Calendar</strong> (deadline + a reminder
              shortly before). On iPhone or Mac, add the same Google account under{" "}
              <span className="whitespace-nowrap">Settings → Calendar</span> to see those events in the{" "}
              <strong className="font-semibold text-[var(--workspace-fg)]">Apple Calendar</strong> app — no separate
              Route5 app required.
            </p>
            <Link
              href="/api/integrations/gmail/connect"
              className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[var(--workspace-accent)] px-4 text-[13px] font-semibold text-[var(--workspace-on-accent)] transition hover:opacity-95"
            >
              Connect Google (includes Calendar)
            </Link>
            <p className="mt-2 text-[11px] text-[var(--workspace-muted-fg)]">
              Uses the same secure Google sign-in as Gmail. Microsoft Teams / Outlook calendar sync is available when
              your org connects Teams with calendar permissions.
            </p>
          </div>
        </div>
      </div>
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

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integrations — Route5",
  description: "Bring Linear, GitHub, and Desk into your workflow — open and start working.",
};

const cards = [
  {
    href: "/desk",
    name: "Desk",
    desc: "Capture and run extractions — your main working surface.",
    badge: "Start",
  },
  {
    href: "/integrations/google",
    name: "Google Workspace",
    desc: "Docs, Calendar, and Gmail context — connect as OAuth rolls out; paste works today.",
    badge: "Open",
  },
  {
    href: "/integrations/linear",
    name: "Linear",
    desc: "Browse, import, and send issue context into projects — works out of the box.",
    badge: "Open",
  },
  {
    href: "/integrations/github",
    name: "GitHub",
    desc: "Pull issue text by URL or browse samples — same flow as production.",
    badge: "Open",
  },
  {
    href: "/integrations/figma",
    name: "Figma",
    desc: "Paste frames and feedback → structured extractions.",
    badge: "Open",
  },
];

export default function IntegrationsHubPage() {
  return (
    <div className="mx-auto max-w-[800px] pb-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Workspace
      </p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
        Integrations
      </h1>
      <p className="mt-2 max-w-md text-[13px] text-[var(--workspace-muted-fg)]">
        Open any tool below and start working — samples and imports run immediately. Your workspace keeps
        everything in one place.
      </p>
      <p className="mt-4">
        <Link
          href="/workspace/apps"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
        >
          Open app launcher — all tools at once
        </Link>
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="glass-liquid group flex h-full flex-col rounded-2xl p-6 transition hover:border-white/80"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-accent)]">
                {c.badge}
              </span>
              <span className="mt-2 text-[18px] font-semibold text-[var(--workspace-fg)]">{c.name}</span>
              <span className="mt-2 flex-1 text-[13px] text-[var(--workspace-muted-fg)]">{c.desc}</span>
              <span className="mt-4 text-[13px] font-medium text-[var(--workspace-accent)] group-hover:underline">
                Open
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

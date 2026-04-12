import type { Metadata } from "next";
import Link from "next/link";
import IntegrationStatusStrip from "@/components/integrations/IntegrationStatusStrip";

export const metadata: Metadata = {
  title: "Integrations — Route5",
  description: "See what integrations are live, what works by import, and where to start.",
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
    desc: "Import issue text into extractions when your server has a Linear API key; otherwise the hub shows a labeled preview.",
    badge: "Open",
  },
  {
    href: "/integrations/github",
    name: "GitHub",
    desc: "Fetch issue bodies by URL when GitHub is configured; otherwise preview rows demonstrate the same import flow.",
    badge: "Open",
  },
  {
    href: "/integrations/slack",
    name: "Slack",
    desc: "Pro+ connector — paste exports to Desk today; optional server tokens for routing.",
    badge: "Pro+",
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
    <div className="mx-auto max-w-[920px] pb-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Integrations
      </p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
        Integrations
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
        <Link href="/desk" className="font-semibold text-[var(--workspace-accent)] hover:underline">
          Desk
        </Link>{" "}
        is where you capture and run work: connectors pull Linear, GitHub, Figma, and Google context into the same
        extraction pipeline that feeds Overview and project history. Status below reflects live configuration.
      </p>
      <IntegrationStatusStrip />
      <p className="mt-4">
        <Link
          href="/workspace/apps"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
        >
          Open library
        </Link>
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="dashboard-home-card group flex h-full flex-col rounded-[24px] p-6 transition hover:border-[var(--workspace-accent)]/30"
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

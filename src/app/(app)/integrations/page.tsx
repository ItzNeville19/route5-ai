import type { Metadata } from "next";
import Link from "next/link";
import IntegrationStatusStrip from "@/components/integrations/IntegrationStatusStrip";
import IntegrationsDirectoryGrid from "@/components/integrations/IntegrationsDirectoryGrid";
import { deskUrl } from "@/lib/desk-routes";

export const metadata: Metadata = {
  title: "Integrations — Route5",
  description: "Connect your tools and move decisions into accountable execution.",
};

const cards = [
  {
    href: deskUrl(),
    name: "Desk",
    desc: "Capture and process decisions — your main working surface.",
    badge: "Start",
    availability: "live",
  },
  {
    href: "/integrations/google",
    name: "Google Workspace",
    desc: "Docs, Calendar, and Gmail context — connect as OAuth rolls out; paste works today.",
    badge: "Open",
    availability: "import",
  },
  {
    href: "/integrations/linear",
    name: "Linear",
    desc: "Import issue text into captured decisions when your server has a Linear API key; otherwise this page shows a labeled preview.",
    badge: "Open",
    readinessKey: "linear",
    availability: "import",
  },
  {
    href: "/integrations/github",
    name: "GitHub",
    desc: "Fetch issue bodies by URL when GitHub is configured; otherwise preview rows demonstrate the same import flow.",
    badge: "Open",
    readinessKey: "github",
    availability: "import",
  },
  {
    href: "/integrations/slack",
    name: "Slack",
    desc: "Pro+ connector — paste exports to Desk today; optional server tokens for routing.",
    badge: "Pro+",
    availability: "waitlist",
  },
  {
    href: "/integrations/figma",
    name: "Figma",
    desc: "Paste frames and feedback → structured captures.",
    badge: "Open",
    readinessKey: "figma",
    availability: "import",
  },
] as const;

export default function IntegrationsHubPage() {
  return (
    <div className="mx-auto max-w-[920px] pb-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        Integrations
      </p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
        Integration command center
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
        <Link href={deskUrl()} className="font-semibold text-[var(--workspace-accent)] hover:underline">
          Desk
        </Link>{" "}
        is where your team confirms commitments. Connectors pull context from Linear, GitHub, Figma, and Google into
        one operating lane so leaders can see clean execution status in every project.
      </p>
      <IntegrationStatusStrip />
      <p className="mt-4">
        <Link
          href="/overview"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
        >
          Open Overview
        </Link>
      </p>
      <IntegrationsDirectoryGrid cards={[...cards]} />
    </div>
  );
}

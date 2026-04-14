import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { PRODUCT_ROADMAP } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "Roadmap — Route5",
  description: "Planned directions for Route5 — explicitly not the live product.",
};

export default function DocsRoadmapPage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Guides"
      kicker="Guides"
      title="Roadmap"
      intro="This page exists so “roadmap” is never a mystery link. Nothing below is guaranteed or sold as shipped product."
    >
      <p>
        For vendor-specific requests (Slack, Jira, etc.), use{" "}
        <Link href="/marketplace" className="font-medium text-[var(--workspace-accent)] hover:underline">
          Marketplace
        </Link>{" "}
        — each integration has its own detail screen and a contact path.
      </p>
      <ul className="space-y-3">
        {PRODUCT_ROADMAP.map((line) => (
          <li
            key={line}
            className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3 text-[14px] text-[var(--workspace-fg)]"
          >
            {line}
          </li>
        ))}
      </ul>
      <p>
        <Link
          href="/docs/product"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          ← What we ship (live)
        </Link>
      </p>
    </WorkspaceArticle>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { PRODUCT_HONEST, PRODUCT_VALUE_REALITY } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "Boundaries — Route5",
  description: "Out-of-scope items and how Route5 sets clear expectations for customers.",
};

export default function DocsBoundariesPage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Guides"
      kicker="Guides"
      title="Boundaries"
      intro="Clear limits for what the workspace does today. For full detail, see the product guide."
    >
      <section className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Not in scope today
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {PRODUCT_HONEST.notThis}
        </p>
      </section>
      <p className="text-[15px]">{PRODUCT_HONEST.why}</p>
      <section className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Pricing alignment
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {PRODUCT_VALUE_REALITY.summary}
        </p>
      </section>
      <p>
        <Link
          href="/docs/product"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          Product guide →
        </Link>
      </p>
    </WorkspaceArticle>
  );
}

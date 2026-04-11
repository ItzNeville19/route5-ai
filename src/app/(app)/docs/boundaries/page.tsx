import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { PRODUCT_HONEST } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "Boundaries — Route5",
  description: "What Route5 does not claim to do today.",
};

export default function DocsBoundariesPage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Documentation"
      kicker="Documentation"
      title="Boundaries"
      intro={PRODUCT_HONEST.oneLine}
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
      <p>
        <Link
          href="/docs/product"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          What we ship →
        </Link>
      </p>
    </WorkspaceArticle>
  );
}

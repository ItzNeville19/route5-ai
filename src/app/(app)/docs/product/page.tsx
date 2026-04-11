import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { PRODUCT_LIVE, PRODUCT_ROADMAP } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "What we ship — Route5",
  description: "Live workspace capabilities and honest roadmap labeling.",
};

export default function DocsProductPage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Documentation"
      kicker="Documentation"
      title="What we ship"
      intro="Below is what the signed-in workspace does today. Roadmap items are listed separately — they are not installed connectors."
    >
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Live in the product
        </h2>
        <ul className="mt-4 space-y-3">
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">Authentication.</span>{" "}
            {PRODUCT_LIVE.auth}
          </li>
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">Projects.</span>{" "}
            {PRODUCT_LIVE.projects}
          </li>
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">Extraction.</span>{" "}
            {PRODUCT_LIVE.extract}
          </li>
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">Linear.</span>{" "}
            {PRODUCT_LIVE.linear}
          </li>
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">GitHub.</span>{" "}
            {PRODUCT_LIVE.github}
          </li>
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">Actions.</span>{" "}
            {PRODUCT_LIVE.actions}
          </li>
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">Limits &amp; data.</span>{" "}
            {PRODUCT_LIVE.limits} {PRODUCT_LIVE.data}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Roadmap (not shipped)
        </h2>
        <p className="mt-3">
          These are directions we may pursue. They are{" "}
          <strong className="font-medium text-[var(--workspace-fg)]">not</strong> part of the
          live extraction product until they appear in the app.
        </p>
        <ul className="mt-4 space-y-2">
          {PRODUCT_ROADMAP.map((line) => (
            <li key={line} className="border-l-2 border-[var(--workspace-accent)]/40 pl-3 text-[14px]">
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link
            href="/docs/roadmap"
            className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
          >
            Roadmap detail page →
          </Link>
        </p>
      </section>
    </WorkspaceArticle>
  );
}

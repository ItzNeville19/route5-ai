import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { PRODUCT_LIVE, PRODUCT_ROADMAP, PRODUCT_VALUE_REALITY } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "What we ship — Route5",
  description: "Live workspace capabilities and honest roadmap labeling.",
};

export default function DocsProductPage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Guides"
      kicker="Guides"
      title="What we ship"
      intro="Simple version: projects hold your work, Desk turns pasted notes into clear next steps and checklists, and the overview shows real progress. Details and honest limits are below."
    >
      <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          {PRODUCT_VALUE_REALITY.headline}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {PRODUCT_VALUE_REALITY.summary}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <span className="font-medium text-[var(--workspace-fg)]">Without AI keys:</span>{" "}
          {PRODUCT_VALUE_REALITY.withoutAi}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <span className="font-medium text-[var(--workspace-fg)]">With AI keys:</span>{" "}
          {PRODUCT_VALUE_REALITY.withAi}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          <span className="font-medium text-[var(--workspace-fg)]">Integrations:</span>{" "}
          {PRODUCT_VALUE_REALITY.integrationsHonesty}
        </p>
      </section>

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
            <span className="font-medium text-[var(--workspace-fg)]">Webhook input.</span>{" "}
            {PRODUCT_LIVE.ingest}
          </li>
          <li className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-3">
            <span className="font-medium text-[var(--workspace-fg)]">Decision capture.</span>{" "}
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
          live decision-capture product until they appear in the app.
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

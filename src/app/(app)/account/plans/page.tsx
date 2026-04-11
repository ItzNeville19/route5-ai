import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { PRODUCT_LIVE, PRODUCT_ROADMAP } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "Plans — Route5",
  description: "Workspace plans and limits — in-app view.",
};

export default function AccountPlansPage() {
  return (
    <WorkspaceArticle
      backHref="/projects"
      backLabel="Projects"
      kicker="Account"
      title="Plans"
      intro="Straightforward access: the workspace you are in reflects what we ship today. Enterprise packaging is by conversation."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
            Workspace
          </p>
          <p className="mt-2 text-[15px] font-medium text-[var(--workspace-fg)]">
            Included with your account
          </p>
          <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            <li>{PRODUCT_LIVE.auth}</li>
            <li>{PRODUCT_LIVE.projects}</li>
            <li>{PRODUCT_LIVE.extract}</li>
            <li>{PRODUCT_LIVE.linear}</li>
            <li>{PRODUCT_LIVE.github}</li>
            <li>{PRODUCT_LIVE.actions}</li>
            <li>{PRODUCT_LIVE.limits}</li>
            <li>{PRODUCT_LIVE.data}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
            Enterprise
          </p>
          <p className="mt-2 text-[15px] font-medium text-[var(--workspace-fg)]">By conversation</p>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Procurement, security review, SSO beyond defaults, or deployment expectations beyond
            the current surface — we scope honestly after a short intro.
          </p>
          <ul className="mt-4 space-y-2 text-[12px] text-[var(--workspace-muted-fg)]">
            {PRODUCT_ROADMAP.map((line) => (
              <li key={line}>Roadmap: {line}</li>
            ))}
          </ul>
          <Link
            href="/support"
            className="mt-5 inline-flex rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/40"
          >
            Contact
          </Link>
        </div>
      </div>
      <p className="text-[13px]">
        Public marketing copy also lives at{" "}
        <a
          href="/pricing"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          route5.ai/pricing
        </a>
        .
      </p>
    </WorkspaceArticle>
  );
}

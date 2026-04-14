import type { Metadata } from "next";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";

export const metadata: Metadata = {
  title: "Terms — Route5 workspace",
  description: "Workspace terms summary with link to the full public terms.",
};

export default function DocsTermsWorkspacePage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Guides"
      kicker="Legal"
      title="Terms (workspace)"
      intro="Summary for quick orientation. Binding language is on the public terms page."
    >
      <p>
        Workspace access is subject to the same terms as the Route5 sites and services you
        agree to at sign-up. AI outputs are starting points — your team remains accountable
        for operational decisions.
      </p>
      <p>
        <a
          href="/terms"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          Full terms of service (public site) →
        </a>
      </p>
    </WorkspaceArticle>
  );
}
